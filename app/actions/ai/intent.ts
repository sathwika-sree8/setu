export type Intent =
  | "MY_INVESTMENTS"
  | "REVENUE_QUERY"
  | "UPDATE_QUERY"
  | "STARTUP_INFO"
  | "UNKNOWN";

export async function detectIntent(question: string): Promise<Intent> {
  const q = question.toLowerCase();

  if (q.includes("my investment") || q.includes("my portfolio") || q.includes("what did i invest")) {
    return "MY_INVESTMENTS";
  }
  if (q.includes("revenue")) return "REVENUE_QUERY";
  if (q.includes("update")) return "UPDATE_QUERY";

  return "STARTUP_INFO";
}
