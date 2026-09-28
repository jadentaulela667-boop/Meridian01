import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { useDeskStore } from "@/lib/store";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: true,
        staleTime: 15_000,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  const setHydrated = useDeskStore((s) => s.setHydrated);

  useEffect(() => {
    void useDeskStore.persist.rehydrate();
    setHydrated();
  }, [setHydrated]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          className:
            "border border-border bg-card text-foreground font-sans shadow-none",
        }}
      />
    </QueryClientProvider>
  );
}
