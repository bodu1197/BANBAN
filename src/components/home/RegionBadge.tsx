interface RegionBadgeProps {
  name: string;
}

export function RegionBadge({
  name,
}: Readonly<RegionBadgeProps>): React.ReactElement {
  return (
    <span className="inline-flex h-[21px] items-center rounded-[5px] bg-muted px-[7px] text-[10px] text-foreground">
      {name}
    </span>
  );
}
