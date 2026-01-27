import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Sales Tracking Dashboard",
  description: "Premium Sales CRM Dashboard with real-time analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <CurrencyProvider>
              <ProfileProvider>
                <NotificationProvider>
                  {children}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      style: {
                        background: '#1a1a1a',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                      },
                    }}
                  />
                </NotificationProvider>
              </ProfileProvider>
            </CurrencyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}