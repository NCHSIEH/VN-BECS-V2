import React from 'react';
import { Droplet } from 'lucide-react';

export function BloodDropLogo({ size = 32, className = "" }: { size?: number, className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-rose-600/20 blur-lg rounded-full animate-pulse" />
      <div className="relative bg-gradient-to-br from-rose-500 to-rose-700 p-2 rounded-2xl shadow-xl shadow-rose-900/40 border border-rose-400/30 transform -rotate-12 group-hover:rotate-0 transition-transform duration-500">
        <Droplet size={size} className="text-white fill-current" />
        <div className="absolute top-1 left-1 w-2 h-2 bg-white/40 rounded-full blur-[1px]" />
      </div>
    </div>
  );
}
