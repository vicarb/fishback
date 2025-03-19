import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import QueryProvider from "@/context/QueryProvider"; // Import Query Provider
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin panel for managing orders and products",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider> 
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}