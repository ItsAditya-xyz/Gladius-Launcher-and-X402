import { JetBrains_Mono, Sora, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ContextProvider from "../../context";
import { headers } from 'next/headers';
import { Toaster } from "sonner";
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://www.arenapay.ai"),
  title: {
    default: "ArenaX402",
    template: "%s · ArenaX402",
  },
  description: "Micropayment-gated APIs via HTTP 402 on Avalanche (AVAX, ARENA, GLADIUS).",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/arena.svg",
    shortcut: "/icons/arena.svg",
    apple: "/icons/arena.svg",
  },
  openGraph: {
    title: "ArenaX402",
    description: "Micropayment-gated APIs via HTTP 402 on Avalanche.",
    url: "/",
    images: [
      { url: "/icons/banner.png" }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArenaX402",
    description: "Micropayment-gated APIs via HTTP 402 on Avalanche.",
    images: ["/icons/banner.png"],
  },
};

export default async function RootLayout({ children }) {
    const cookieHeaders = await headers();
  const cookies = cookieHeaders.get("cookie");
  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
          <Toaster position="top-right" richColors />
          <ContextProvider cookies={cookies}>{children}</ContextProvider>
      </body>
    </html>
  );
}
