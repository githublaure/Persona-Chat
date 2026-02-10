import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CharacterAvatarProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function CharacterAvatar({ name, color, size = "md" }: CharacterAvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarFallback
        style={{ backgroundColor: color, color: "#fff" }}
        className="font-semibold"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
