// @client-reason: DropdownMenu wrapper isolates @radix-ui/react-dropdown-menu to a lazy chunk
"use client";

import dynamic from "next/dynamic";
import { STRINGS } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const UserMenuContent = dynamic(() => import("./UserMenuContent").then((m) => m.UserMenuContent), { ssr: false });

interface LoggedInUserMenuProps {
    user: {
        id: string;
        email?: string;
        name?: string;
        avatarUrl?: string;
    };
}

export function LoggedInUserMenu({ user }: Readonly<LoggedInUserMenuProps>): React.ReactElement {
    const initials = user.name
        ? user.name.slice(0, 2).toUpperCase()
        : user.email?.slice(0, 2).toUpperCase() ?? "U";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {/* 아이콘만 두면 마이페이지로 가는 길인지 알 수 없다 → md 이상에서 라벨을 같이 보여준다.
                    접근명은 보이는 라벨("마이페이지")로 시작해야 음성 제어가 동작한다(WCAG 2.5.3). */}
                <Button variant="ghost" className="hidden gap-2 px-3 md:inline-flex" aria-label={`${STRINGS.common.mypage} 메뉴 열기`}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name ?? "User"} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{STRINGS.common.mypage}</span>
                </Button>
            </DropdownMenuTrigger>
            <UserMenuContent user={user} />
        </DropdownMenu>
    );
}
