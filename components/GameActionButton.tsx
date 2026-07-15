import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type GameActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  children: ReactNode;
};

export function GameActionButton({
  icon,
  children,
  className,
  type = "button",
  ...props
}: GameActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "group relative w-full overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 p-4 pr-16 text-left text-white shadow-[0_5px_14px_-8px_rgb(15_118_110_/_0.55)] transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_7px_18px_-9px_rgb(15_118_110_/_0.6)] active:translate-y-px active:shadow-[0_2px_8px_-6px_rgb(15_118_110_/_0.45)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_14px_-8px_rgb(15_118_110_/_0.55)] disabled:active:translate-y-0 sm:p-5 sm:pr-20",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1 select-none text-[4rem] leading-none opacity-15 transition-transform duration-150 group-hover:scale-110 group-active:scale-95 sm:right-3 sm:top-1.5 sm:text-[5rem]"
      >
        {icon}
      </span>
      <span className="relative z-10 font-display text-xl font-extrabold tracking-tight transition-transform duration-150 group-active:translate-y-px sm:text-2xl">
        {children}
      </span>
    </button>
  );
}
