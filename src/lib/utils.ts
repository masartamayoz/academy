import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatContentTitle(item: { type?: string; title?: string; order?: number } | null | undefined): string {
  if (!item || !item.title) return '';
  if (item.type === 'summer_review') {
    // Remove legacy session/lesson prefix like "الحصة 1 من 10:", "الحصة 1:", "درس مراجعة صيفية:", etc.
    let clean = item.title.replace(/^(الحصة|الدرس|درس مراجعة صيفية)\s*\d+(\s*من\s*\d+)?:?\s*/i, '').trim();
    // If clean already starts with "المحور X", return it as is
    if (/^المحور\s*\d+/i.test(clean)) {
      return clean;
    }
    // Remove standalone "المحور:" if present without a number
    clean = clean.replace(/^المحور\s*:?\s*/i, '').trim();
    return clean ? `المحور ${item.order || 1}: ${clean}` : `المحور ${item.order || 1}`;
  }
  return item.title;
}
