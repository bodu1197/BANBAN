import Link from "next/link";
import { STRINGS } from "@/lib/strings";
import { SquareImage } from "../SquareImage";
import { UserAvatar } from "../UserAvatar";
import type { HomeRecruitment } from "@/lib/supabase/home-queries";

interface RecruitmentCardProps {
  recruitment: HomeRecruitment;
}

export function RecruitmentCard({
  recruitment,
}: Readonly<RecruitmentCardProps>): React.ReactElement {
  const freeLabel = STRINGS.recruitment.free;
  return (
    <Link
      href={`/recruitment/${recruitment.id}`}
      className="group inline-block w-[140px] align-top whitespace-normal mr-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative">
        <SquareImage
          src={recruitment.thumbnailImage}
          alt={recruitment.title}
          sizes="140px"
        />
        <span className="absolute left-1.5 top-1.5 rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
          {recruitment.expense > 0 ? `${recruitment.expense.toLocaleString()}원` : freeLabel}
        </span>

      </div>
      <div className="mt-1.5 space-y-1">
        <UserAvatar name={recruitment.artistName} imageSrc={recruitment.artistProfileImage} />
        <p className="truncate text-xs font-medium transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
          {recruitment.title}
        </p>
        {recruitment.parts ? (
          <p className="truncate text-[11px] text-muted-foreground">
            {recruitment.parts}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
