import Image from "next/image";

interface UserAvatarProps {
  name: string;
  imageSrc?: string | null;
}

export function UserAvatar({
  name,
  imageSrc,
}: Readonly<UserAvatarProps>): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-[18px] w-[18px] shrink-0 overflow-hidden rounded-full bg-muted">
        <Image
          src={imageSrc ?? "/icons/avatar.webp"}
          alt={name}
          fill
          sizes="18px"
          quality={70}
          className="object-cover"
        />
      </div>
      <span className="max-w-[120px] truncate text-xs text-muted-foreground">
        {name}
      </span>
    </div>
  );
}
