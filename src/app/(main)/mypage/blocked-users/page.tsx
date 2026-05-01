// @client-reason: useState for unblock interaction, useEffect for data loading
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserX } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getBlockedUsers, unblockUser, type BlockedUser } from "@/lib/actions/block";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul",
  });
}

function BlockedUserRow({ blockedUser, onUnblock }: Readonly<{
  blockedUser: BlockedUser;
  onUnblock: (id: string) => void;
}>): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  const handleUnblock = (): void => {
    if (!confirm(`${blockedUser.nickname}님의 차단을 해제하시겠습니까?`)) return;
    startTransition(async () => {
      const result = await unblockUser(blockedUser.blockedId);
      if (result.success) {
        toast.success("차단이 해제되었습니다");
        onUnblock(blockedUser.id);
      } else {
        toast.error("차단 해제에 실패했습니다");
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
      <Image
        src={getAvatarUrl(blockedUser.profileImage) ?? "/images/default_profile.svg"}
        alt={blockedUser.nickname}
        width={40}
        height={40}
        className="rounded-full"
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{blockedUser.nickname}</p>
        <p className="text-xs text-muted-foreground">차단일: {formatDate(blockedUser.createdAt)}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnblock}
        disabled={isPending}
        className="focus-visible:ring-2 focus-visible:ring-ring"
      >
        차단 해제
      </Button>
    </div>
  );
}

function BlockedUsersHeader(): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b bg-background px-4">
      <Link
        href="/mypage"
        className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="뒤로 가기"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-lg font-semibold">차단 사용자 관리</h1>
    </header>
  );
}

function BlockedUsersEmpty(): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <UserX className="h-12 w-12 text-muted-foreground/50" />
      <p className="text-muted-foreground">차단한 사용자가 없습니다</p>
    </div>
  );
}

export default function BlockedUsersPage(): React.ReactElement {
  const { user } = useAuth();
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    getBlockedUsers().then((users) => {
      setBlockedUsers(users);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [user, router]);

  const handleUnblock = (id: string): void => {
    setBlockedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  if (!user || loading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col pb-24">
      <BlockedUsersHeader />
      <main className="space-y-2 p-4">
        {blockedUsers.length === 0 ? <BlockedUsersEmpty /> : blockedUsers.map((b) => (
          <BlockedUserRow key={b.id} blockedUser={b} onUnblock={handleUnblock} />
        ))}
      </main>
    </div>
  );
}
