"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  askAdminAi,
  toggleAiSetting,
  toggleAutomation,
  runDailyReportNow,
  runAbandonedCartJob,
} from "@/lib/actions/ai-admin";

type Props = {
  geminiConfigured: boolean;
  settings: Record<string, unknown>;
  rules: { id: string; name: string; enabled: boolean; config: unknown }[];
  logs: any[];
  escalations: number;
  productDraftsToday: number;
  marketingDraftsOpen: number;
  risks: any[];
  abandoned: any[];
};

export default function AiControlCenterClient(props: Props) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reportText, setReportText] = useState<string | null>(null);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReply(null);
    startTransition(async () => {
      const result = await askAdminAi(question);
      if (!result.ok && !result.reply) {
        setError("Request failed.");
        return;
      }
      setReply(result.reply);
      router.refresh();
    });
  }

  function setSetting(key: string, value: boolean) {
    startTransition(async () => {
      await toggleAiSetting(key, value);
      router.refresh();
    });
  }

  function setRule(id: string, enabled: boolean) {
    startTransition(async () => {
      await toggleAutomation(id, enabled);
      router.refresh();
    });
  }

  function runReport() {
    startTransition(async () => {
      const r = await runDailyReportNow();
      if (r.ok) setReportText(r.text);
      router.refresh();
    });
  }

  function runCarts() {
    startTransition(async () => {
      await runAbandonedCartJob();
      router.refresh();
    });
  }

  const settingKeys = [
    ["ai_enabled", "AI master"],
    ["customer_ai_enabled", "Customer AI"],
    ["marketing_ai_enabled", "Marketing AI"],
    ["product_generation_enabled", "Product generation"],
    ["abandoned_cart_enabled", "Abandoned cart"],
    ["telegram_alerts_enabled", "Telegram alerts"],
  ] as const;

  return (
    <div className="space-y-8">
      {/* Status */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gemini" value={props.geminiConfigured ? "Configured" : "Missing key"} alert={!props.geminiConfigured} />
        <Stat label="Escalations" value={String(props.escalations)} alert={props.escalations > 0} />
        <Stat label="Product drafts today" value={`${props.productDraftsToday}/3`} />
        <Stat label="Marketing drafts" value={String(props.marketingDraftsOpen)} />
      </div>

      {/* Ask */}
      <form onSubmit={ask} className="card space-y-3 p-4">
        <label className="text-sm font-medium">Ask your business…</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What needs my attention? Low stock? Today's orders?"
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
        <button type="submit" disabled={pending || !question.trim()} className="btn-primary disabled:opacity-60">
          {pending ? "Thinking…" : "Ask AI"}
        </button>
        {error && <p className="text-sm text-bad">{error}</p>}
        {reply && (
          <div className="rounded-xl border border-line bg-raised p-4 text-sm whitespace-pre-wrap">{reply}</div>
        )}
        <div className="flex flex-wrap gap-2 text-[11px] text-mute">
          {[
            "What needs my attention?",
            "Show today's orders",
            "Which products are low on stock?",
            "Find abandoned carts",
            "Give me a sales estimate",
            "Pricing suggestions",
          ].map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-full border border-line px-2 py-1 hover:text-ink"
              onClick={() => setQuestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* Controls */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-medium">AI toggles</h2>
          {settingKeys.map(([key, label]) => {
            const on = props.settings[key] !== false && props.settings[key] !== "false";
            return (
              <label key={key} className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setSetting(key, !on)}
                  className={`rounded-full px-3 py-1 text-xs ${on ? "bg-mist/20 text-mist" : "bg-raised text-mute"}`}
                >
                  {on ? "ON" : "OFF"}
                </button>
              </label>
            );
          })}
        </div>

        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-medium">Automations</h2>
          {props.rules.map((r) => (
            <label key={r.id} className="flex items-center justify-between text-sm">
              <span>{r.name}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => setRule(r.id, !r.enabled)}
                className={`rounded-full px-3 py-1 text-xs ${r.enabled ? "bg-mist/20 text-mist" : "bg-raised text-mute"}`}
              >
                {r.enabled ? "ON" : "OFF"}
              </button>
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={runReport} disabled={pending} className="btn-secondary text-xs">
              Run daily report now
            </button>
            <button type="button" onClick={runCarts} disabled={pending} className="btn-secondary text-xs">
              Process abandoned carts
            </button>
          </div>
          {reportText && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-raised p-3 text-[11px] whitespace-pre-wrap">
              {reportText}
            </pre>
          )}
        </div>
      </div>

      {/* Queues */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-medium">Open risk flags</h2>
          {props.risks.length === 0 ? (
            <p className="text-xs text-mute">None</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {props.risks.map((r) => (
                <li key={r.id} className="rounded-lg bg-raised p-2">
                  <span className="text-ember">{r.severity}</span> — {r.summary}
                  {r.entity_type === "order" && (
                    <Link href={`/admin/orders/${r.entity_id}`} className="ml-2 underline">
                      Order
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-medium">Abandoned carts</h2>
          {props.abandoned.length === 0 ? (
            <p className="text-xs text-mute">None open</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {props.abandoned.map((c) => (
                <li key={c.id} className="rounded-lg bg-raised p-2">
                  {c.email} · ${Number(c.subtotal).toFixed(2)} · {c.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/ai-products" className="underline text-mute hover:text-ink">
          AI Product Studio
        </Link>
        <Link href="/admin/ai-marketing" className="underline text-mute hover:text-ink">
          AI Marketing
        </Link>
        <Link href="/admin/messages" className="underline text-mute hover:text-ink">
          Messages / escalations
        </Link>
      </div>

      {/* Activity log */}
      <div className="card p-4">
        <h2 className="mb-2 text-sm font-medium">AI activity log</h2>
        <div className="max-h-64 space-y-1 overflow-y-auto text-[11px] text-mute">
          {props.logs.length === 0 && <p>No activity yet.</p>}
          {props.logs.map((l) => (
            <div key={l.id} className="border-b border-line/50 py-1.5">
              <span className="text-ink">{l.agent}</span> · {l.action}
              {l.tool_name ? ` · ${l.tool_name}` : ""} ·{" "}
              {l.success === false ? "FAIL" : "ok"} ·{" "}
              {new Date(l.created_at).toLocaleString()}
              {l.result_summary && (
                <div className="truncate opacity-80">{l.result_summary}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="card p-3">
      <p className="text-[10px] uppercase tracking-wide text-mute">{label}</p>
      <p className={`font-display text-lg font-semibold ${alert ? "text-ember" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
