import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import {
  LayoutDashboard,
  Users,
  Building,
  CreditCard,
  Bell,
  AlertTriangle,
  Package,
  Car,
  CalendarCheck,
  FileText,
  Wrench,
  Truck,
  FileSignature,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { SidebarItem } from "./sidebar-item";

const NAVIGATION = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Financeiro", href: "/financeiro", icon: CreditCard },
  { name: "Moradores", href: "/moradores", icon: Users },
  { name: "Unidades", href: "/unidades", icon: Building },
  { name: "Avisos", href: "/avisos", icon: Bell },
  { name: "Ocorrências", href: "/ocorrencias", icon: AlertTriangle },
  { name: "Encomendas", href: "/encomendas", icon: Package },
  { name: "Veículos", href: "/veiculos", icon: Car },
  { name: "Reservas", href: "/reservas", icon: CalendarCheck },
  { name: "Documentos", href: "/documentos", icon: FileText },
  { name: "Ordens de Serviço", href: "/ordens-servico", icon: Wrench },
  { name: "Fornecedores", href: "/fornecedores", icon: Truck },
  { name: "Contratos", href: "/contratos", icon: FileSignature },
  { name: "Agenda", href: "/agenda", icon: CalendarDays },
  { name: "Marketplace", href: "/marketplace", icon: ShoppingBag },
  { name: "Atividades", href: "/atividades", icon: Activity },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, condominium, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <div className="font-bold text-lg tracking-tight text-primary">CondoOS</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-40 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-64",
          "w-64",
        )}
      >
        {/* Brand / collapse toggle */}
        <div
          className={cn(
            "flex items-center border-b border-sidebar-border/50 transition-all",
            collapsed ? "px-0 py-4 justify-center" : "px-5 py-4 gap-2",
          )}
        >
          <div className="p-1.5 rounded-md bg-sidebar-primary/15 text-sidebar-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-bold text-lg tracking-tight text-sidebar-primary leading-tight">
                CondoOS
              </div>
              {condominium && (
                <div className="text-[11px] text-sidebar-foreground/60 truncate leading-tight">
                  {condominium.name}
                </div>
              )}
            </div>
          )}
          {/* Desktop collapse toggle */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  className={cn(
                    "hidden md:inline-flex h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                    collapsed && "absolute -right-3 top-5 h-6 w-6 bg-sidebar border border-sidebar-border rounded-full shadow-sm z-10",
                  )}
                  aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
                >
                  {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {collapsed ? "Expandir menu" : "Recolher menu"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <nav
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {NAVIGATION.map((item) => {
            const active =
              location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <SidebarItem
                key={item.name}
                href={item.href}
                name={item.name}
                icon={item.icon}
                active={active}
                collapsed={collapsed}
                onClick={() => setMobileOpen(false)}
              />
            );
          })}
        </nav>

        <Separator className="bg-sidebar-border/50" />

        {/* User footer */}
        <div className={cn("transition-all", collapsed ? "p-2" : "p-3")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-9 w-9 bg-sidebar-accent text-sidebar-accent-foreground cursor-default">
                      <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                        {user?.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-muted-foreground">{user?.email}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={logout}
                      className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      aria-label="Sair"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    Sair
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-2 px-1">
                <Avatar className="h-9 w-9 bg-sidebar-accent text-sidebar-accent-foreground">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                    {user?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user?.name}</div>
                  <div className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
