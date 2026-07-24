import { cn } from "@/lib/utils";

type AtlasAcademyLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  priority?: boolean;
};

export function AtlasAcademyLogo({
  variant = "full",
  className,
  priority = false,
}: AtlasAcademyLogoProps) {
  const src =
    variant === "mark" ? "/brand/atlas-academy-mark.png" : "/brand/atlas-academy-logo.png";
  const alt = variant === "mark" ? "Atlas Academy" : "Atlas Academy — Geography Trivia";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand PNG with transparency
    <img
      src={src}
      alt={alt}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("h-auto w-auto max-h-full object-contain", className)}
    />
  );
}
