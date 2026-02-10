
import groq from "./groq";

export async function embed(text: string) {

  const res = await groq.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return res.data[0].embedding;
}
