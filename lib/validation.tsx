import { z } from 'zod';

// Simple check that the string ends with a common image extension
// (ignoring any query params). This is intentionally permissive
// so CDN-style URLs like Wikimedia thumbs are accepted.
function isLikelyImageUrl(url: string): boolean {
  const cleaned = url.trim().toLowerCase().split("?")[0];
  return (
    cleaned.endsWith(".jpg") ||
    cleaned.endsWith(".jpeg") ||
    cleaned.endsWith(".png") ||
    cleaned.endsWith(".gif") ||
    cleaned.endsWith(".webp") ||
    cleaned.endsWith(".svg") ||
    cleaned.endsWith(".bmp") ||
    cleaned.endsWith(".ico")
  );
}



export const formSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(900),
  category: z.string().min(1).max(30),

  link: z
    .string()
    .trim() // 🔥 THIS FIXES EVERYTHING
    .url("Please enter a valid URL")
    .refine(isLikelyImageUrl, {
      message: "URL must point to an image (.jpg, .png, .webp, etc.)",
    }),

  pitch: z.string().min(10),
});


