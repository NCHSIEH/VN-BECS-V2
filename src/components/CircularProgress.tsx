import React from 'react';

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  subLabel: string;
}

export function CircularProgress({ value, max, size = 120, strokeWidth = 10, color = '#0ea5e9', label, subLabel }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-clinical-card rounded-3xl transition-all hover:shadow-lg border border-slate-50">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 1s ease-in-out'
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-clinical-text">{value}</span>
          <span className="text-[10px] text-clinical-muted font-bold uppercase">Units</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-black text-clinical-text uppercase tracking-widest">{label}</div>
        <div className="text-[10px] text-clinical-muted font-medium">{subLabel}</div>
      </div>
    </div>
  );
}
