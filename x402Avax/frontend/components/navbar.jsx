"use client";

import Link from "next/link";
import arenaImage from "../public/icons/arena.svg";

export default function Navbar({ showWallet = false }) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center">
            <img src={arenaImage.src} alt="Logo" className="w-6 h-6" />
          </div>
          <span className="text-lg font-semibold text-foreground">
            Arena<span className="text-primary">pay</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {showWallet ? <appkit-button class="" /> : null}
        </div>
      </div>
    </header>
  );
}
