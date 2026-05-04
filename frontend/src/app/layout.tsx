import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Prokip P3 — Performance Pulse",
  description: "Internal Accountability & Reward Ecosystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: "12px",
                padding: "16px 20px",
                fontSize: "14px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
              },
              success: {
                style: { borderLeft: "4px solid #22C55E" },
              },
              error: {
                style: { borderLeft: "4px solid #EF4444" },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
