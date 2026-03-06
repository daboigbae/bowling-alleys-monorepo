'use client';

import { QueryClientProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { GeolocationProvider } from "@/lib/geolocation";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HubsInitializer } from "@/components/HubsInitializer";
import ScrollToTop from "@/components/ScrollToTop";
import { Analytics } from "@/components/Analytics";
import type { FooterVenue } from "@/lib/footer-venues-types";

interface ProvidersProps {
  children: React.ReactNode;
  initialTopAlleys?: FooterVenue[];
}

export function Providers({ children, initialTopAlleys }: ProvidersProps) {
  return (
    <HelmetProvider>
      <Analytics />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
        forcedTheme="light"
      >
        <QueryClientProvider>
          <TooltipProvider>
            <AuthProvider>
              <GeolocationProvider>
                <HubsInitializer />
                <ScrollToTop />
                <div className="min-h-screen bg-white flex flex-col">
                  <Header />
                  <main className="flex-grow bg-white">{children}</main>
                  <Footer initialTopAlleys={initialTopAlleys} />
                </div>
                <Toaster />
              </GeolocationProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}


