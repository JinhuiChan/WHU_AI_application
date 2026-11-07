import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 3 项目用 tailwind-merge v2；不要升级到 v3（那是配 Tailwind 4 的）。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
