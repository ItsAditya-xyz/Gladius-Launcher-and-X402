import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const SITE_URL = "https://launch.arenapay.ai";
const DESCRIPTION = "Launch AI agents with wallets that don't just yap";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["400", "500", "600", "700"]
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Agent Launcher",
    template: "%s | Agent Launcher"
  },
  description: DESCRIPTION,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Agent Launcher",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Agent Launcher",
    type: "website",
    images: [
      {
        url: "/icons/banner.png",
        width: 1200,
        height: 630,
        alt: "Agent Launcher"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Launcher",
    description: DESCRIPTION,
    images: ["/icons/banner.png"]
  },
  icons: {
    icon: "/icons/arena.png",
    apple: "/icons/arena.png"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexMono.variable} min-h-screen`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "bg-card text-foreground border border-border shadow-sm rounded-lg",
              title: "font-medium",
              description: "text-muted-foreground text-sm",
              actionButton:
                "bg-primary text-primary-foreground hover:bg-primary/90",
              cancelButton:
                "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }
          }}
        />
      </body>
    </html>
  );
}
