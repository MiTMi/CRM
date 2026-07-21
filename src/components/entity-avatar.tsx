import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AVATAR_TINTS, initials } from "@/lib/data/constants";
import { cn } from "@/lib/utils";

export function EntityAvatar({
  name,
  accent = "indigo",
  size = "default",
  className,
  square = false,
}: {
  name: string;
  accent?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  square?: boolean;
}) {
  const tint = AVATAR_TINTS[accent] ?? AVATAR_TINTS.indigo;
  return (
    <Avatar
      size={size}
      className={cn(square && "rounded-lg after:rounded-lg", className)}
    >
      <AvatarFallback
        className={cn(
          "font-medium",
          tint,
          square && "rounded-lg",
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
