import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>

      {items.length === 0 && (
        <p className="text-gray-500">No notifications yet</p>
      )}

      {items.map((item) => (
        <Link
          key={item.id}
          href={item.link ?? "#"}
          className="block border p-4 rounded hover:bg-gray-50"
        >
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-sm text-gray-600">{item.message}</p>
        </Link>
      ))}
    </div>
  );
}
