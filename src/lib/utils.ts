import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}

export function formatCurrency(amount: number, currency: string = "LKR"): string {
  return `${currency} ${amount.toFixed(2)}`;
}
