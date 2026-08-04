import { FlagImage } from "@/components/FlagDisplay";
import { getProfileAvatar } from "@/lib/profile-avatars";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-16 w-16",
} as const;

type ProfileAvatarProps = {
  avatarId?: string;
  avatarColor?: string;
  size?: keyof typeof SIZE_CLASSES;
  alt?: string;
  className?: string;
};

export function ProfileAvatar({
  avatarId,
  avatarColor,
  size = "md",
  alt = "",
  className,
}: ProfileAvatarProps) {
  const avatar = getProfileAvatar(avatarId);
  const sharedClassName = cn(
    "block aspect-square rounded-full",
    SIZE_CLASSES[size],
    className,
  );

  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar.src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(sharedClassName, "object-cover")}
      />
    );
  }

  return (
    <span
      aria-hidden={alt ? undefined : true}
      className={sharedClassName}
      style={{ backgroundColor: avatarColor || "#94a3b8" }}
    />
  );
}

export function ProfileAvatarFlag({
  avatarId,
  alt,
  className,
}: {
  avatarId?: string;
  alt?: string;
  className?: string;
}) {
  const avatar = getProfileAvatar(avatarId);
  if (!avatar) return null;

  return (
    <FlagImage
      code={avatar.flagCode}
      alt={alt ?? `Primary location flag for ${avatar.location}`}
      width={48}
      constrainedAxis="height"
      className={cn("h-3.5 w-auto max-w-7", className)}
    />
  );
}

export function ProfileAvatarDetails({
  avatarId,
  className,
}: {
  avatarId?: string;
  className?: string;
}) {
  const avatar = getProfileAvatar(avatarId);
  if (!avatar) return null;

  return (
    <span className={cn("block min-w-0 text-center", className)}>
      <span className="block break-words text-[0.65rem] font-semibold leading-tight text-slate-700 dark:text-slate-200">
        {avatar.culture}
      </span>
      <span className="mt-0.5 block break-words text-[0.6rem] leading-tight text-slate-500 dark:text-slate-400">
        {avatar.location}
      </span>
    </span>
  );
}
