// src/llm.ts
export async function askLLM(messages: any[]) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "gpt-4o-mini", messages }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err}`);
  }
  return response.json();
}