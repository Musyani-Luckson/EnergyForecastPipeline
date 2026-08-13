import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CircularGaugeProps {
  /** 0–100. */
  value: number;
  size?: number;
  thickness?: number;
  /** Tailwind text-* colour class, applied to the arc via currentColor. */
  tone?: string;
  /** Centre content; defaults to the rounded percentage. */
  children?: ReactNode;
  className?: string;
}

/** SVG ring gauge — used for coverage completeness and the readiness score. */
export default function CircularGauge({
  value,
  size = 120,
  thickness = 10,
  tone = "text-blue-600",
  children,
  className,
}: CircularGaugeProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped.toFixed(0)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className={cn("transition-all duration-700", tone)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? (
          <span className={cn("text-xl font-bold tabular-nums", tone)}>
            {clamped.toFixed(clamped % 1 === 0 ? 0 : 1)}%
          </span>
        )}
      </div>
    </div>
  );
}
