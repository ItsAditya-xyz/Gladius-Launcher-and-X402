"use client";
import React from "react";
import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-center">
      <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
