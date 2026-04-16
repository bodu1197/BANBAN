import Link from "next/link";
import dynamic from "next/dynamic";
import { STRINGS } from "@/lib/strings";
import { HeaderSearchIcon } from "./HeaderSearch";
import { ThemeToggle } from "./ThemeToggle";

const HeaderUserSection = dynamic(() => import("./HeaderUserSection").then((m) => m.HeaderUserSection));

export function Header(): React.ReactElement {
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

                    <HeaderUserSection />
                </div>
            </div>
        </header>
    );
}
