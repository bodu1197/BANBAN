import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { HeaderStickySearch } from "./HeaderStickySearch";

const HeaderUserSection = dynamic(() => import("./HeaderUserSection").then((m) => m.HeaderUserSection));

export function Header(): React.ReactElement {
    return (
        <header className="sticky top-0 z-50 w-full bg-muted">
            <div className="relative mx-auto flex h-16 max-w-[1024px] items-center justify-between px-4 md:px-6">
                <Link
                    href={"/"}
                    aria-label="반언니 홈으로 이동"
                    className="ml-[30px] flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                    <HeaderStickySearch />
                    <HeaderUserSection />
                </div>
            </div>
        </header>
    );
}
