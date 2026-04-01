import { cn, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

interface Props {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span className={cn("badge text-[10px]", getOrderStatusColor(status), className)}>
      {getOrderStatusLabel(status)}
    </span>
  );
}
