"use client";

import { useId } from "react";
import { getDailyCalendarParts } from "@/lib/game-engine";
import { cn } from "@/lib/utils";

type DailyCalendarIconProps = {
  className?: string;
  date?: Date;
  variant?: "watermark" | "solid";
};

const HEADER_RED = "#FF453A";

export function DailyCalendarIcon({
  className,
  date = new Date(),
  variant = "watermark",
}: DailyCalendarIconProps) {
  const id = useId().replace(/:/g, "");
  const bodyGradientId = `daily-calendar-body-${id}`;
  const headerGradientId = `daily-calendar-header-${id}`;
  const { monthShort, day, daysInMonth, firstWeekday } = getDailyCalendarParts(date);
  const dayLabel = String(day);
  const dayFontSize = dayLabel.length >= 2 ? 33 : 37;
  const isSolid = variant === "solid";

  const gridDots: { day: number; x: number; y: number; isToday: boolean }[] = [];
  const gridOriginX = 49.5;
  const gridOriginY = 16.8;
  const gridCell = 3.15;

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const cellIndex = firstWeekday + dayNumber - 1;
    gridDots.push({
      day: dayNumber,
      x: gridOriginX + (cellIndex % 7) * gridCell,
      y: gridOriginY + Math.floor(cellIndex / 7) * gridCell,
      isToday: dayNumber === day,
    });
  }

  return (
    <svg
      viewBox="0 0 88 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      aria-hidden={!isSolid}
      role={isSolid ? "img" : undefined}
      aria-label={isSolid ? `Calendar showing ${monthShort} ${dayLabel}` : undefined}
    >
      <defs>
        <linearGradient id={bodyGradientId} x1="44" y1="14" x2="44" y2="92" gradientUnits="userSpaceOnUse">
          {isSolid ? (
            <>
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#F8FAFC" />
            </>
          ) : (
            <>
              <stop stopColor="currentColor" stopOpacity="0.34" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.18" />
            </>
          )}
        </linearGradient>
        <linearGradient id={headerGradientId} x1="44" y1="14" x2="44" y2="34" gradientUnits="userSpaceOnUse">
          {isSolid ? (
            <>
              <stop stopColor="#FF5E57" />
              <stop offset="1" stopColor={HEADER_RED} />
            </>
          ) : (
            <>
              <stop stopColor={HEADER_RED} stopOpacity="0.78" />
              <stop offset="1" stopColor={HEADER_RED} stopOpacity="0.58" />
            </>
          )}
        </linearGradient>
      </defs>

      <rect
        x="4"
        y="12"
        width="80"
        height="80"
        rx="12"
        fill={`url(#${bodyGradientId})`}
        stroke={isSolid ? "#E2E8F0" : "currentColor"}
        strokeOpacity={isSolid ? 1 : 0.22}
        strokeWidth="1.2"
      />

      <rect
        x="4"
        y="12"
        width="80"
        height="20"
        rx="12"
        fill={`url(#${headerGradientId})`}
      />
      <rect x="4" y="24" width="80" height="8" fill={`url(#${headerGradientId})`} />

      <path
        d="M4 32H84"
        stroke={isSolid ? "#E2E8F0" : "currentColor"}
        strokeOpacity={isSolid ? 1 : 0.18}
        strokeWidth="1"
      />

      <circle
        cx="26"
        cy="9.5"
        r="4.2"
        fill={isSolid ? "#CBD5E1" : "currentColor"}
        fillOpacity={isSolid ? 1 : 0.12}
        stroke={isSolid ? "#94A3B8" : "currentColor"}
        strokeOpacity={isSolid ? 1 : 0.28}
        strokeWidth="1.1"
      />
      <circle
        cx="62"
        cy="9.5"
        r="4.2"
        fill={isSolid ? "#CBD5E1" : "currentColor"}
        fillOpacity={isSolid ? 1 : 0.12}
        stroke={isSolid ? "#94A3B8" : "currentColor"}
        strokeOpacity={isSolid ? 1 : 0.28}
        strokeWidth="1.1"
      />
      <rect
        x="23.5"
        y="8.5"
        width="5"
        height="5.5"
        rx="1.2"
        fill={isSolid ? "#E2E8F0" : "currentColor"}
        fillOpacity={isSolid ? 1 : 0.08}
      />
      <rect
        x="59.5"
        y="8.5"
        width="5"
        height="5.5"
        rx="1.2"
        fill={isSolid ? "#E2E8F0" : "currentColor"}
        fillOpacity={isSolid ? 1 : 0.08}
      />

      <text
        x="13"
        y="25.5"
        fill={isSolid ? "#FFFFFF" : "currentColor"}
        fillOpacity={isSolid ? 1 : 0.92}
        fontFamily="var(--font-nunito), system-ui, sans-serif"
        fontSize="10.5"
        fontWeight="800"
        letterSpacing="0.08em"
      >
        {monthShort}
      </text>

      {gridDots.map(({ day: gridDay, x, y, isToday }) => (
        <circle
          key={gridDay}
          cx={x}
          cy={y}
          r={isToday ? 1.35 : 0.95}
          fill={isSolid ? "#FFFFFF" : "currentColor"}
          fillOpacity={isToday ? (isSolid ? 1 : 0.95) : isSolid ? 0.72 : 0.34}
        />
      ))}

      <text
        x="44"
        y="69"
        textAnchor="middle"
        fill={isSolid ? "#0F172A" : "currentColor"}
        fillOpacity={isSolid ? 1 : 0.9}
        fontFamily="var(--font-nunito), system-ui, sans-serif"
        fontSize={dayFontSize}
        fontWeight="300"
        letterSpacing="-0.04em"
      >
        {dayLabel}
      </text>
    </svg>
  );
}
