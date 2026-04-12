import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { STRINGS } from "@/lib/strings";
import dynamic from "next/dynamic";
const MobileNav = dynamic(() => import("./NavLinks").then(mod => mod.MobileNav));
import { MainMenuBar } from "./MainMenuBar";
import { HeaderSearchIcon } from "./HeaderSearch";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
const NotificationBell = dynamic(() => import("./NotificationBell").then(m => m.NotificationBell));
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
          <span className="text-brand-primary">타투</span>
          <span>어때</span>
        </Link>

        <div className="flex items-center gap-2">
          <HeaderSearchIcon placeholder={STRINGS.globalSearch.headerSearchPlaceholder} />

          <ThemeToggle />

          {user ? <NotificationBell /> : null}

          <UserMenu user={user} />

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72" aria-describedby={undefined}>
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <MobileNav labels={STRINGS.nav} loginLabel={STRINGS.common.login} logoutLabel={STRINGS.common.logout} user={user} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <MainMenuBar labels={STRINGS.nav} />
    </header>
  );
}
