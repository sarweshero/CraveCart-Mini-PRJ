import { cn } from "@/lib/utils";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center gap-3", className)}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#161410] border border-[#2A2620] flex items-center justify-center text-[#2A2620]">
          {icon}
        </div>
      )}
      <div>
        <p className="text-[#F5EDD8] font-semibold">{title}</p>
        {description && <p className="text-[#9E9080] text-sm mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
