import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/layout/app-shell";

// Pages
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import Units from "@/pages/units";
import Residents from "@/pages/residents";
import Notices from "@/pages/notices";
import Issues from "@/pages/issues";
import Deliveries from "@/pages/deliveries";
import Vehicles from "@/pages/vehicles";
import Reservations from "@/pages/reservations";
import Documents from "@/pages/documents";
import ServiceOrders from "@/pages/service-orders";
import Suppliers from "@/pages/suppliers";
import Charges from "@/pages/finance/charges";
import Payments from "@/pages/finance/payments";
import Contracts from "@/pages/contracts";
import Events from "@/pages/events";
import Settings from "@/pages/settings";
import Users from "@/pages/settings/users";
import Roles from "@/pages/settings/roles";
import ActivityLog from "@/pages/activity";

const queryClient = new QueryClient();

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/financeiro">
        {() => <ProtectedRoute component={Charges} />}
      </Route>

      <Route path="/financeiro/pagamentos">
        {() => <ProtectedRoute component={Payments} />}
      </Route>

      <Route path="/unidades">
        {() => <ProtectedRoute component={Units} />}
      </Route>
      
      <Route path="/moradores">
        {() => <ProtectedRoute component={Residents} />}
      </Route>

      <Route path="/avisos">
        {() => <ProtectedRoute component={Notices} />}
      </Route>

      <Route path="/ocorrencias">
        {() => <ProtectedRoute component={Issues} />}
      </Route>

      <Route path="/encomendas">
        {() => <ProtectedRoute component={Deliveries} />}
      </Route>

      <Route path="/veiculos">
        {() => <ProtectedRoute component={Vehicles} />}
      </Route>

      <Route path="/reservas">
        {() => <ProtectedRoute component={Reservations} />}
      </Route>

      <Route path="/documentos">
        {() => <ProtectedRoute component={Documents} />}
      </Route>

      <Route path="/ordens-servico">
        {() => <ProtectedRoute component={ServiceOrders} />}
      </Route>

      <Route path="/fornecedores">
        {() => <ProtectedRoute component={Suppliers} />}
      </Route>

      <Route path="/contratos">
        {() => <ProtectedRoute component={Contracts} />}
      </Route>

      <Route path="/agenda">
        {() => <ProtectedRoute component={Events} />}
      </Route>

      <Route path="/configuracoes">
        {() => <ProtectedRoute component={Settings} />}
      </Route>

      <Route path="/usuarios">
        {() => <ProtectedRoute component={Users} />}
      </Route>

      <Route path="/perfis">
        {() => <ProtectedRoute component={Roles} />}
      </Route>

      <Route path="/atividades">
        {() => <ProtectedRoute component={ActivityLog} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <TooltipProvider>
            <AppRouter />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
