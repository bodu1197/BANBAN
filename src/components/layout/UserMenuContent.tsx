// @client-reason: onClick handler for logout
"use client";

import { STRINGS } from "@/lib/strings";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/supabase/auth";
import { UserInfoDisplay } from "./UserInfoDisplay";
interface UserMenuContentProps {
    user: {
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  };
}

export function UserMenuContent({ user }: Readonly<UserMenuContentProps>): React.ReactElement {
  const handleLogout = async (): Promise<void> => {
    await signOut();
  };

  return (
    <DropdownMenuContent align="end" className="w-48">
      <div className="px-2 py-1.5">
        <UserInfoDisplay name={user.name} email={user.email} />
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href={"/mypage"} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          {STRINGS.nav.mypage}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={handleLogout}
        className="cursor-pointer text-destructive focus:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {STRINGS.common.logout}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
