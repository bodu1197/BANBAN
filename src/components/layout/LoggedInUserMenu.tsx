// @client-reason: DropdownMenu wrapper isolates @radix-ui/react-dropdown-menu to a lazy chunk
"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DropdownMenu = dynamic(() => import("@/components/ui/dropdown-menu").then((m) => m.DropdownMenu));
const DropdownMenuTrigger = dynamic(() =>
    import("@/components/ui/dropdown-menu").then((m) => m.DropdownMenuTrigger),
);
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
                <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="User menu">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name ?? "User"} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <UserMenuContent user={user} />
        </DropdownMenu>
    );
}
