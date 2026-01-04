import { client } from "./client";
import "server-only";

export async function sanityFetchStatic<T>({
  query,
  params = {},
  tags = [],
}: {
  query: string;
  params?: Record<string, any>;
  tags?: string[];
}) {
  return {
    data: await client.fetch<T>(query, params, {
      next: {
        revalidate: 60,
        tags,
      },
    }),
  };
}
