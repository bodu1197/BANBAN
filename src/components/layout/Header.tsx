import Link from "next/link";
import dynamic from "next/dynamic";
import { STRINGS } from "@/lib/strings";
import { HeaderSearchIcon } from "./HeaderSearch";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";

const NotificationBell = dynamic(() => import("./NotificationBell").then((m) => m.NotificationBell));
const HeaderMobileMenu = dynamic(() => import("./HeaderMobileMenu").then((m) => m.HeaderMobileMenu));

interface HeaderProps {
    user: {
        id: string;
        email?: string;
        name?: string;
        avatarUrl?: string;
    } | null;
}

export function Header({ user }: Readonly<HeaderProps>): React.ReactElement {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="relative mx-auto flex h-16 max-w-[767px] items-center justify-between px-4">
                <Link
                    href={"/"}
                    className="flex items-center gap-2 font-bold text-xl"
                >
                    <span className="ml-[30px] text-brand-primary">반</span>
                    <span>언니</span>
                </Link>

                <div className="flex items-center gap-2">
                    <HeaderSearchIcon placeholder={STRINGS.globalSearch.headerSearchPlaceholder} />

                    <ThemeToggle />

                    {user ? <NotificationBell /> : null}

                    <UserMenu user={user} />

                    <HeaderMobileMenu user={user} />
                </div>
            </div>
        </header>
    );
}
