import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "confirmed",
  confirmed: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

export const STATUS_NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  placed: "Confirm Order",
  confirmed: "Start Preparing",
  preparing: "Mark Out for Delivery",
  out_for_delivery: "Mark Delivered",
};

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatCurrency(n: number) { return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:0}).format(n); }
export function formatDate(d: string) { return new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true}).format(new Date(d)); }
export function formatTime(d: string) { return new Intl.DateTimeFormat("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}).format(new Date(d)); }
export function formatRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000); if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
  return new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short"}).format(new Date(d));
}
export function getOrderStatusLabel(s: OrderStatus) {
  return STATUS_LABELS[s] ?? s;
}
export function getOrderStatusColor(s: OrderStatus) {
  return ({placed:"badge-info",confirmed:"badge-info",preparing:"badge-warning",out_for_delivery:"badge-warning",delivered:"badge-success",cancelled:"badge-error"})[s] ?? "badge-neutral";
}
export function getNextStatus(s: OrderStatus): OrderStatus | null {
  return STATUS_TRANSITIONS[s] ?? null;
}
