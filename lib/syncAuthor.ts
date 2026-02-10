import { client } from "@/sanity/lib/client";
import { currentUser } from "@clerk/nextjs/server";

export async function syncAuthor() {
  const user = await currentUser();
  if (!user) return null;

  const userId = user.id;
  const email = user.emailAddresses[0]?.emailAddress;

  if (!email) return null;

  // Check if author already exists
  const existingAuthor = await client.fetch(
    `*[_type == "author" && clerkId == $clerkId][0]`,
    { clerkId: userId }
  );

  if (existingAuthor) {
    return existingAuthor;
  }

  // Create author in Sanity
  const newAuthor = await client.create({
    _type: "author",
    clerkId: userId,
    email,
    name: user.fullName || "Unnamed User",
    username: email.split("@")[0],
    image: user.imageUrl || "",
  });

  return newAuthor;
}
