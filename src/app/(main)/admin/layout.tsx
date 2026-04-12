import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export default async function AdminLayout({ children }: Readonly<{
    children: React.ReactNode;
}>): Promise<React.ReactElement> {
    const user = await getUser();
    if (!user) redirect("/login");

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    const isAdmin = (profile as { is_admin: boolean } | null)?.is_admin;
    if (!isAdmin) redirect("/");

    return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
