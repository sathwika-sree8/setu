import { z } from 'zod';

// Common image file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.ico'];

function isLikelyImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const pathname = parsed.pathname.toLowerCase();

    return IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
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


