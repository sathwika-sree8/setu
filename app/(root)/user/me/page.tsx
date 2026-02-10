import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { syncAuthor } from "@/lib/syncAuthor";

export default async function Page() {
  await syncAuthor();
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="p-6">
        <p>Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>

      <div className="grid gap-4 max-w-md">
        {/* Requests I sent */}
        <Link
          href="/user/me/requests/sent"
          className="block border rounded-lg p-4 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold">My Requests</h2>
          <p className="text-sm text-gray-600">
            View startups you requested to invest in
          </p>
        </Link>

        {/* Requests I received */}
        <Link
          href="/user/me/requests/incoming"
          className="block border rounded-lg p-4 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold">Incoming Requests</h2>
          <p className="text-sm text-gray-600">
            View investors requesting to connect
          </p>
        </Link>

        <Link href={`/user/${userId}`}>View Public Profile</Link>

      </div>
    </div>
  );
}
