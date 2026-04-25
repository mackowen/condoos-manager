import { Link } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  name: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

export function SidebarItem({ href, name, icon: Icon, active, collapsed, onClick }: Props) {
  const content = (
    <Link href={href} onClick={onClick} className="block">
      <span
        className={cn(
          "flex items-center gap-3 rounded-md text-sm transition-all duration-200",
          collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 py-2",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active && "text-sidebar-primary-foreground")} />
        <span
          className={cn(
            "truncate transition-all",
            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100",
          )}
        >
          {name}
        </span>
        {active && !collapsed && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/80" />
        )}
      </span>
    </Link>
  );

  if (!collapsed) return content;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
