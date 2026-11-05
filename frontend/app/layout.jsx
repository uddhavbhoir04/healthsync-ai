import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export const metadata = {
  title: "HealthSync AI — Modern Healthcare & Diagnostic Platform",
  description: "Next-generation healthcare SaaS connecting patients with certified diagnostic laboratories, smart home sample collection, and AI-powered health monitoring.",
  keywords: ["healthcare", "lab tests", "diagnostics", "home phlebotomy", "health AI", "biomarkers"],
  authors: [{ name: "HealthSync AI" }],
  openGraph: {
    title: "HealthSync AI — Modern Healthcare & Diagnostic Platform",
    description: "Your health simplified with intelligence. Book verified diagnostic tests with certified phlebotomists.",
    url: "https://healthsync.ai",
    siteName: "HealthSync AI",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full scroll-smooth antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right" 
            richColors 
            closeButton 
            toastOptions={{
              style: {
                borderRadius: "1rem",
                padding: "1rem",
                fontSize: "0.8125rem",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
