export default function EnvCheckPage() {
  return (
    <pre>
      {JSON.stringify(
        {
          clerk: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "MISSING",
          database: process.env.DATABASE_URL ?? "MISSING",
        },
        null,
        2
      )}
    </pre>
  );
}
