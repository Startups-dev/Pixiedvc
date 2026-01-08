type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function requireApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return apiKey;
}

export async function createEmbedding(input: string): Promise<number[]> {
  const apiKey = requireApiKey();
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embeddings error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding: number[] }>;
  };

  const embedding = data?.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenAI embeddings missing in response");
  }

  return embedding;
}

export async function createChatCompletion({
  messages,
  temperature = 0.2,
  model = "gpt-4o-mini",
}: {
  messages: OpenAIChatMessage[];
  temperature?: number;
  model?: string;
}): Promise<string> {
  const apiKey = requireApiKey();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI chat error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI chat response missing content");
  }

  return content;
}
