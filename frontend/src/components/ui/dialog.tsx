'use client';

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

const Dialog = ({ isOpen, onClose, title, description, children }: DialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass rounded-card shadow-lg animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">{title}</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-surface-active transition-colors text-text-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {description && (
            <p className="text-text-secondary text-sm mb-6">{description}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export { Dialog }
