import { AdminSidebar } from "./admin-sidebar";

export function AdminLayoutShell({ children }: Readonly<{
    children: React.ReactNode;
}>): React.ReactElement {
    return (
        // z-[100] 불투명 전체화면 — consumer 헤더/바텀네비(z-50)를 덮는다.
        // ⚠️ 전체화면 모달은 이 위에 떠야 하므로 z-[110](dialog.tsx·sheet.tsx·NewGrantModal).
        //    이 값을 올리면 그 모달 z 도 함께 올릴 것(현재 +10 간격 유지).
        // ⚠️ 앵커형 포털(Select/Popover/Dropdown, 아직 z-50)은 미대응 — admin 안에서 쓰면 이 쉘에 가려진다.
        //    필요해지면 z-index 토큰화로 일괄 상향(별도 후속).
        <div className="fixed inset-0 z-[100] flex bg-zinc-950">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto pb-40">
                {children}
            </main>
        </div>
    );
}
