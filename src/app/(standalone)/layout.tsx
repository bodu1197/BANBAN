import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/QueryProvider";

export default function StandaloneLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>): React.ReactElement {
    return (
        <QueryProvider>
            <div className="flex min-h-screen flex-col">
                {children}
            </div>
            <Toaster position="top-center" richColors />
        </QueryProvider>
    );
}
