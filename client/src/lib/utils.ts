import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

// export function formatPrice(val: number) {
//   return new Intl.NumberFormat("en-NP", {
//     style: "currency",
//     currency: "NPR",
//     maximumFractionDigits: 0,
//   }).format(val);
// }
