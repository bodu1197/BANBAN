// @client-reason: Sheet wrapper isolates @radix-ui/react-dialog to a lazy chunk
"use client";

import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/strings";

const Sheet = dynamic(() => import("@/components/ui/sheet").then((m) => m.Sheet));
const SheetContent = dynamic(() => import("@/components/ui/sheet").then((m) => m.SheetContent));
const SheetTrigger = dynamic(() => import("@/components/ui/sheet").then((m) => m.SheetTrigger));
const SheetTitle = dynamic(() => import("@/components/ui/sheet").then((m) => m.SheetTitle));
const MobileNav = dynamic(() => import("./NavLinks").then((m) => m.MobileNav));

interface HeaderMobileMenuProps {
    user: {
        id: string;
        email?: string;
        name?: string;
        avatarUrl?: string;
    } | null;
}

export function HeaderMobileMenu({ user }: Readonly<HeaderMobileMenuProps>): React.ReactElement {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72" aria-describedby={undefined}>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <MobileNav
                    labels={STRINGS.nav}
                    loginLabel={STRINGS.common.login}
                    logoutLabel={STRINGS.common.logout}
                    user={user}
                />
            </SheetContent>
        </Sheet>
    );
}
