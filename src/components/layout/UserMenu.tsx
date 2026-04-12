// @client-reason: onClick handler for logout, DropdownMenu interactive state
"use client";

import { STRINGS } from "@/lib/strings";
import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
interface UserMenuProps {
    user: {
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  } | null;
}

import dynamic from "next/dynamic";
const UserMenuContent = dynamic(() => import("./UserMenuContent").then(mod => mod.UserMenuContent), { ssr: false });

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

  const initials = user.name
    ? user.name.slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          aria-label="User menu"
        >
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
