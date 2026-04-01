import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = { sm: "w-4 h-4 border-2", md: "w-6 h-6 border-2", lg: "w-8 h-8 border-4" };

export function LoadingSpinner({ size = "md", className }: Props) {
  return (
    <div
      className={cn(
        "rounded-full border-current/20 border-t-current animate-spin",
        SIZE[size],
        className
      )}
    />
  );
}
