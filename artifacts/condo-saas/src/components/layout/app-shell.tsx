import React, { useState } from "react";
import { Link, useLocation } from "wouter";
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
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  { name: "Atividades", href: "/atividades", icon: Activity },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, condominium, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="font-bold text-lg tracking-tight text-primary">CondoOS</div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
        fixed md:sticky top-0 left-0 z-40
        w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        transition-transform duration-200 ease-in-out
        flex flex-col
      `}>
        <div className="p-6 hidden md:block">
          <div className="font-bold text-2xl tracking-tight text-sidebar-primary">CondoOS</div>
          {condominium && (
            <div className="mt-2 text-sm text-sidebar-foreground/70 truncate">
              {condominium.name}
            </div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAVIGATION.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} className="block">
                <span className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                  ${active 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }
                `} onClick={() => setSidebarOpen(false)}>
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-9 w-9 bg-sidebar-accent text-sidebar-accent-foreground">
              <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center px-6 justify-between shrink-0 hidden md:flex">
          <div className="flex-1 max-w-xl">
            {/* Search goes here */}
          </div>
          <div className="flex items-center gap-4">
            {/* Dark mode toggle, notifications go here */}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}