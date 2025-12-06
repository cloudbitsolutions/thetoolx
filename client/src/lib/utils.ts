import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeFilename(title: string, maxLength = 30): string {
  const cleaned = title
    .replace(/[^\w\s-]/g, "")         // Remove all non-word, non-space, non-hyphen chars
    .replace(/\s+/g, "_")            // Replace spaces with underscores
    .substring(0, maxLength)         // Limit length
    .replace(/_+$/, "");             // Remove trailing underscores
  return cleaned || `yt-audio-${Date.now()}`; // Fallback if title is empty
}
