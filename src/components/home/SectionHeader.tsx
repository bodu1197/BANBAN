import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  moreLink?: string;
  moreText?: string;
}

export function SectionHeader({
  title,
  moreLink,
  moreText = "See more",
}: Readonly<SectionHeaderProps>): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-4 mb-2.5">
      <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h2>
      {moreLink && (
        <Link
          href={moreLink}
          className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {moreText}
        </Link>
      )}
    </div>
  );
}
