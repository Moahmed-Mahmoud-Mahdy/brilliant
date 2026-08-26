"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCartStore } from "@/lib/store";

// Global client providers: TanStack Query + persisted-cart rehydration.
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 },
        },
      })
  );

  // Rehydrate the persisted cart AFTER mount (skipHydration) to keep
  // the first client render identical to the server render.
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
