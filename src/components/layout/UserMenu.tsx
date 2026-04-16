import dynamic from "next/dynamic";
import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/strings";

const LoggedInUserMenu = dynamic(() => import("./LoggedInUserMenu").then((m) => m.LoggedInUserMenu));

interface UserMenuProps {
    user: {
        id: string;
        email?: string;
        name?: string;
        avatarUrl?: string;
    } | null;
}

export function UserMenu({ user }: Readonly<UserMenuProps>): React.ReactElement {
    if (!user) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex"
                aria-label={STRINGS.common.login}
                asChild
            >
                <Link href={"/login"}>
                    <User className="h-5 w-5" />
                </Link>
            </Button>
        );
    }

    return <LoggedInUserMenu user={user} />;
}
