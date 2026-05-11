import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { STRINGS } from "@/lib/strings";
import { HeaderSearchIcon } from "./HeaderSearch";

const HeaderUserSection = dynamic(() => import("./HeaderUserSection").then((m) => m.HeaderUserSection));

export function Header(): React.ReactElement {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="relative mx-auto flex h-16 max-w-[767px] items-center justify-between px-4">
                <Link
                    href={"/"}
                    className="ml-[30px] flex items-center"
                >
                    <Image
                        src="/ban_logo.png"
                        alt="반언니"
                        width={100}
                        height={32}
                        priority
                    />
                </Link>

                <div className="flex items-center gap-2">
                    <HeaderSearchIcon placeholder={STRINGS.globalSearch.headerSearchPlaceholder} />

                    <HeaderUserSection />
                </div>
            </div>
        </header>
    );
}
