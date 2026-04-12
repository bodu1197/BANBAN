import { AdminSidebar } from "./admin-sidebar";

export function AdminLayoutShell({ children }: Readonly<{
    children: React.ReactNode;
}>): React.ReactElement {
    return (
        <div className="fixed inset-0 z-[100] flex bg-zinc-950">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
