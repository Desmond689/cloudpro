import "server-only";

/**
 * Server-only Gemini client.
 * GEMINI_API_KEY must never leave the server.
 * Provider is modular so it can be swapped later.
 */

// gemini-2.0-flash was shut down (June 2026). Default to a live model.
// Override with GEMINI_MODEL env (e.g. gemini-2.5-flash, gemini-3.5-flash, gemini-3.5-flash-lite).
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

export type GeminiToolDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
};

export type GeminiFunctionCall = {
  name: string;
  args: Record<string, unknown>;
};

export type GeminiResponse = {
  text: string | null;
  functionCalls: GeminiFunctionCall[];
  raw?: unknown;
};

export async function callGemini(opts: {
  systemInstruction: string;
  messages: GeminiMessage[];
  tools?: GeminiToolDeclaration[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: opts.systemInstruction }] },
    contents: opts.messages.map((m) => ({
      role: m.role,
      parts: m.parts,
    })),
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
    },
  };

  if (opts.tools && opts.tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: opts.tools,
      },
    ];
  }

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  let text: string | null = null;
  const functionCalls: GeminiFunctionCall[] = [];

  for (const part of parts) {
    if (part.text) text = (text ?? "") + part.text;
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args ?? {},
      });
    }
  }

  return { text, functionCalls, raw: data };
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
