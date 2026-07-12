import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "react-hot-toast";
import ClientLayout from "@/components/providers/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MentorSpace",
  description: "A premium platform for collaborative learning with real-time video, code editing, and chat.",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "32x32" },
      { url: "/logo.png", sizes: "192x192" },
      { url: "/logo.png", sizes: "512x512" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>
        <AuthProvider>
          <div className="relative min-h-screen overflow-x-hidden">
            {/* Background elements */}
            <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
            <div className="fixed -top-24 -left-24 w-96 h-96 bg-accent/10 blur-[120px] rounded-full -z-10" />
            
            <ClientLayout>
                {children}
            </ClientLayout>
            
            <Toaster position="bottom-right" toastOptions={{
              className: 'glass text-white border-white/10',
              style: {
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
              }
            }} />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
