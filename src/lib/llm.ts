// src/lib/llm.ts
// Tiny browser-only shim. Safe demo behavior:
// - If no VITE_OPENAI_API_KEY is present -> hasLLM() === false and we never call the API.
// - If you *do* set a key, this will call OpenAI's Chat Completions API directly from the browser.
//   (Good for quick demos; for production you’d proxy this on a server to keep the key secret.)

export type LLMResult = { ok: boolean; text?: string; error?: string };

export function hasLLM(): boolean {
  // truthy when a key is present in Vite env
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}

export async function askLLM(system: string, user: string): Promise<LLMResult> {
  if (!hasLLM()) return { ok: false, error: "LLM_OFF" };

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;
  // Optional: override base for self-hosted / proxy
  const base =
    (import.meta.env.VITE_OPENAI_API_BASE as string) ||
    "https://api.openai.com/v1";

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    const text =
      json?.choices?.[0]?.message?.content?.toString?.() ??
      json?.choices?.[0]?.message?.content ??
      "";
    return { ok: true, text };
  } catch (err: any) {
    return { ok: false, error: err?.message || "LLM_ERROR" };
  }
}
