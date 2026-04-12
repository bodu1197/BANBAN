import Image from "next/image";

interface IconWithLabelProps {
  icon: string;
  label: string;
  alt: string;
}

export function IconWithLabel({
  icon,
  label,
  alt,
}: Readonly<IconWithLabelProps>): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Image
        src={icon}
        alt={alt}
        width={18}
        height={18}
      />
      {label}
    </span>
  );
}
