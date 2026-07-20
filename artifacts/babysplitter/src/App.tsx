import { WhatsNewDialog } from "@/components/WhatsNewDialog";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Identity from '@/pages/Identity';
import { HomePage } from '@/pages/Home';
import Settlement from '@/pages/Settlement';
import Chat from '@/pages/Chat';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function SyncWrapper({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  return <>{children}</>;
}

function Router() {
  return (
    <SyncWrapper>
      <Switch>
        <Route path="/" component={Identity} />
        <Route path="/home" component={HomePage} />
        <Route path="/settlement" component={Settlement} />
        <Route path="/chat" component={Chat} />
        <Route path="/history" component={History} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </SyncWrapper>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="babysplitter-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
      <WhatsNewDialog />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
