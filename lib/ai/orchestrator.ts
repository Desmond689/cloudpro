import "server-only";
import { callGemini, isGeminiConfigured, type GeminiMessage } from "./gemini";
import { AI_TOOL_DECLARATIONS, executeTool } from "./tools";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Detect simple buying intent from the latest customer message.
 * This is a fast, deterministic pre-filter — Gemini still does the real reasoning.
 */
function detectBuyingIntent(text: string): {
  hasIntent: boolean;
  signals: string[];
} {
  const t = text.toLowerCase();
  const signals: string[] = [];

  const patterns: [RegExp, string][] = [
    [/\b(i want|i'll take|i'll buy|want to buy|wanna buy|purchase|order this|get this)\b/, "purchase"],
    [/\b(how much|what('s| is) the price|cost|price of)\b/, "price"],
    [/\b(which (one|should)|recommend|suggest|best (for|option)|what should i)\b/, "recommend"],
    [/\b(do you have|got any|looking for|need a|need some|searching for)\b/, "search"],
    [/\b(cheaper|budget|under \$?\d+|less than|afford)\b/, "budget"],
    [/\b(in stock|available|ship|deliver|how (do|to) (i )?order|add to cart|checkout)\b/, "availability_or_checkout"],
    [/\b(compare|difference|vs\.?|versus|better than)\b/, "compare"],
    [/\b(alternative|instead|similar|like this)\b/, "alternatives"],
  ];

  for (const [re, label] of patterns) {
    if (re.test(t)) signals.push(label);
  }

  return { hasIntent: signals.length > 0, signals };
}

const SYSTEM_PROMPT = `You are Cloudra's AI shopping & sales assistant for a curated vape shop (devices, e-liquids, accessories, pods, disposables, etc.).

=== HARD RULES (never break) ===
1. NEVER invent products, prices, stock, discounts, delivery times, order status, or payment confirmation.
2. ONLY use data returned by tools. If a tool returns empty or error, say you don't have that information.
3. Never claim scarcity or pressure the customer. No fake urgency.
4. Never say a payment is confirmed.
5. For payment disputes, refunds, angry customers, complaints, account issues, or anything you cannot answer with tools → call escalateToHuman.
6. Keep replies concise (usually under 120–150 words) unless the customer asks for detail.
7. Always include the real product path (e.g. /shop/product-slug) when recommending so the customer can open it.

=== SALES & RECOMMENDATION BEHAVIOUR ===
When you detect buying intent (wants to buy, asks price, asks which one, mentions budget, use-case, "do you have…"):
1. Clarify the need if unclear (budget, use-case, beginner vs experienced).
2. Call recommendProducts or searchProducts with real filters.
3. Prefer in-stock items. Mention stock honestly (in stock / low stock / out of stock).
4. Explain briefly WHY a product fits (based on real name, category, description, rating).
5. Show the price and the product link.
6. If they want to buy, call getCartGuidance and give clear next steps (open product page → Add to cart → Checkout).
7. Offer 1–2 alternatives if helpful, still from real tool results.

When comparing products, use compareProducts and summarise differences fairly using only returned data.

=== TOOLS ===
- searchProducts — keyword / category / brand / budget search
- recommendProducts — smarter picks by use-case + budget
- getProduct — full detail for one product
- compareProducts — side-by-side of 2–3 products
- checkStock — live stock
- getCategories — list categories
- getOrderStatus — order lookup (needs order number + email)
- getCartGuidance — step-by-step how to add to cart and checkout
- escalateToHuman — hand off to a person

Use tools whenever you need facts. Do not guess.`;

export type OrchestratorResult = {
  reply: string;
  escalated: boolean;
  toolsUsed: string[];
  intentSignals: string[];
  error?: string;
};

export async function runCustomerAgent(opts: {
  conversationId: string;
  customerMessage: string;
  customerName?: string | null;
  customerEmail?: string | null;
}): Promise<OrchestratorResult> {
  const intent = detectBuyingIntent(opts.customerMessage);

  if (!isGeminiConfigured()) {
    return {
      reply:
        "AI assistance is temporarily unavailable. You can continue shopping or ask to speak with a human team member.",
      escalated: false,
      toolsUsed: [],
      intentSignals: intent.signals,
      error: "GEMINI_API_KEY not configured",
    };
  }

  const supabase = createServiceRoleClient();

  // Short-term memory: last messages
  const { data: historyRows } = await supabase
    .from("messages")
    .select("sender_type, message, created_at")
    .eq("conversation_id", opts.conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const history = historyRows ?? [];
  const geminiMessages: GeminiMessage[] = [];

  for (const row of history) {
    if (row.sender_type === "customer") {
      geminiMessages.push({ role: "user", parts: [{ text: row.message }] });
    } else {
      geminiMessages.push({ role: "model", parts: [{ text: row.message }] });
    }
  }

  const last = geminiMessages[geminiMessages.length - 1];
  if (!last || last.role !== "user" || last.parts[0]?.text !== opts.customerMessage) {
    geminiMessages.push({ role: "user", parts: [{ text: opts.customerMessage }] });
  }

  // Inject a soft intent hint for the model (does not invent data)
  let systemInstruction = SYSTEM_PROMPT;
  if (intent.hasIntent) {
    systemInstruction += `\n\n[System note: Buying-intent signals detected in the latest message: ${intent.signals.join(
      ", "
    )}. Prioritise real product search/recommendation tools and clear purchase guidance.]`;
  }

  const toolsUsed: string[] = [];
  let escalated = false;
  let finalText: string | null = null;

  try {
    let response = await callGemini({
      systemInstruction,
      messages: geminiMessages,
      tools: AI_TOOL_DECLARATIONS,
      temperature: 0.35,
      maxOutputTokens: 900,
    });

    // Tool-calling loop (max 3 rounds — cost control)
    let rounds = 0;
    while (response.functionCalls.length > 0 && rounds < 3) {
      rounds++;
      const toolResults: { name: string; response: unknown }[] = [];

      for (const fc of response.functionCalls) {
        toolsUsed.push(fc.name);
        const { result, logSummary } = await executeTool(fc.name, fc.args, {
          conversationId: opts.conversationId,
          customerEmail: opts.customerEmail,
        });
        toolResults.push({ name: fc.name, response: result });

        await supabase.from("ai_activity_logs").insert({
          conversation_id: opts.conversationId,
          agent: "sales",
          action: "tool_call",
          tool_name: fc.name,
          input_summary: JSON.stringify(fc.args).slice(0, 500),
          result_summary: logSummary.slice(0, 500),
          success: true,
        });

        if (fc.name === "escalateToHuman") escalated = true;
      }

      const followUpMessages: GeminiMessage[] = [
        ...geminiMessages,
        {
          role: "model",
          parts: [
            {
              text: `[Called tools: ${toolResults.map((t) => t.name).join(", ")}]`,
            },
          ],
        },
        {
          role: "user",
          parts: [
            {
              text:
                "Tool results (real data only):\n" +
                toolResults
                  .map((t) => `${t.name}: ${JSON.stringify(t.response)}`)
                  .join("\n") +
                "\n\nAnswer the customer using ONLY these results. Include product paths (e.g. /shop/slug) and real prices/stock. Do not invent anything. If buying intent is present, guide them clearly toward the product page and cart.",
            },
          ],
        },
      ];

      response = await callGemini({
        systemInstruction,
        messages: followUpMessages,
        tools: AI_TOOL_DECLARATIONS,
        temperature: 0.3,
        maxOutputTokens: 900,
      });
    }

    finalText =
      response.text?.trim() ||
      (escalated
        ? "I've notified a human team member. They will reply here as soon as possible."
        : "I'm not sure how to help with that. Would you like me to connect you with a human?");

    await supabase.from("ai_activity_logs").insert({
      conversation_id: opts.conversationId,
      agent: "sales",
      action: "reply",
      result_summary: finalText.slice(0, 300),
      success: true,
    });

    // Optional: high-intent Telegram ping (not every message)
    if (
      intent.hasIntent &&
      (intent.signals.includes("purchase") || intent.signals.includes("availability_or_checkout")) &&
      toolsUsed.some((t) =>
        ["recommendProducts", "getCartGuidance", "searchProducts", "getProduct"].includes(t)
      )
    ) {
      try {
        const { sendTelegramText } = await import("@/lib/telegram");
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        await sendTelegramText(
          `🎯 *High-intent customer*\nSignals: ${intent.signals.join(", ")}\nTools: ${toolsUsed.join(
            ", "
          )}\n\nOpen: ${siteUrl}/admin/messages/${opts.conversationId}`
        );
      } catch {
        // non-fatal
      }
    }

    return {
      reply: finalText,
      escalated,
      toolsUsed,
      intentSignals: intent.signals,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI error";
    console.error("[AI orchestrator]", message);

    await supabase.from("ai_activity_logs").insert({
      conversation_id: opts.conversationId,
      agent: "sales",
      action: "error",
      success: false,
      error_message: message.slice(0, 500),
    });

    await supabase
      .from("conversations")
      .update({ ai_last_error: message.slice(0, 500) })
      .eq("id", opts.conversationId);

    return {
      reply:
        "AI assistance is temporarily unavailable. You can continue shopping or ask to speak with a human team member.",
      escalated: false,
      toolsUsed,
      intentSignals: intent.signals,
      error: message,
    };
  }
}
