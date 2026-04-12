// @client-reason: Manages portfolio list state, pagination, and delete mutations
"use client";
import { STRINGS } from "@/lib/strings";
 

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
    type PortfolioRow,
    type HomePortfolio,
    SELECT_BASIC,
    mapPortfolioRow,
} from "@/lib/supabase/portfolio-common";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import Pagination from "@/components/shared/Pagination";
import ArtistPortfolioCard from "./ArtistPortfolioCard";
import ExhibitionTab from "./ExhibitionTab";

const PER_PAGE = 10;

interface PaginationMeta {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface PortfoliosResult {
    data: HomePortfolio[];
    meta: PaginationMeta;
}

async function fetchOwnedPortfolios(
    artistId: string,
    page: number
): Promise<PortfoliosResult> {
    const supabase = createClient();
    const from = (page - 1) * PER_PAGE;
    const to = from + PER_PAGE - 1;

    const { count } = await supabase
        .from("portfolios")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", artistId)
        .is("deleted_at", null);

    const total = count ?? 0;

    const { data: rows, error } = await supabase
        .from("portfolios")
        .select(SELECT_BASIC)
        .eq("artist_id", artistId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) throw error;

    const portfolios = ((rows ?? []) as unknown as PortfolioRow[]).map(
        mapPortfolioRow
    );

    return {
        data: portfolios,
        meta: {
            current_page: page,
            last_page: Math.max(1, Math.ceil(total / PER_PAGE)),
            total,
            per_page: PER_PAGE,
        },
    };
}

async function deletePortfolio(portfolioId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from("portfolios")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", portfolioId);

    if (error) throw error;
}

async function handlePortfolioDelete(
    portfolio: HomePortfolio,
    queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
        await deletePortfolio(portfolio.id);
        alert("삭제되었습니다.");
        queryClient.invalidateQueries({ queryKey: ["portfolios", "owned"] });
    } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error("Failed to delete portfolio:", error);
        alert("삭제에 실패했습니다.");
    }
}

function isReady(
    authLoading: boolean,
    isLoading: boolean,
    data: PortfoliosResult | undefined,
    isArtist: boolean,
): boolean {
    return !authLoading && !isLoading && !!data && isArtist;
}
type TabType = "portfolios" | "exhibitions";

function TabButton({ active, onClick, children }: Readonly<{
    active: boolean; onClick: () => void; children: React.ReactNode;
}>): React.ReactElement {
    return (
        <button type="button" onClick={onClick}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? "bg-brand-primary text-white" : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}>
            {children}
        </button>
    );
}

function PortfolioListContent({ data, handleDelete }: Readonly<{
    data: PortfoliosResult; handleDelete: (p: HomePortfolio) => void;
}>): React.ReactElement {
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                    {STRINGS.common.all} {data.meta.total.toLocaleString()}
                </p>
                <Link
                    href={"/mypage/artist/portfolios/write"}
                    className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                    + {STRINGS.mypage.portfolioManage}
                </Link>
            </div>
            {data.data.length > 0 ? (
                <ul className="space-y-0">
                    {data.data.map((portfolio) => (
                        <ArtistPortfolioCard key={portfolio.id} portfolio={portfolio}
                            onDelete={handleDelete} />
                    ))}
                </ul>
            ) : (
                <div className="py-16 text-center text-muted-foreground">{STRINGS.common.noData}</div>
            )}
        </>
    );
}

export default function PortfolioListClient(): React.ReactElement {
    const router = useRouter();
    const { artist, isArtist, isLoading: authLoading } = useAuth();
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ page: 1 });
    const [activeTab, setActiveTab] = useState<TabType>("portfolios");

    const { data, isLoading } = useQuery({
        queryKey: ["portfolios", "owned", artist?.id, form.page],
        queryFn: () => fetchOwnedPortfolios(artist?.id as string, form.page),
        enabled: !!artist?.id,
    });

    const handleDelete = (portfolio: HomePortfolio): void => {
        handlePortfolioDelete(portfolio, queryClient);
    };

    if (!isReady(authLoading, isLoading, data, isArtist)) {
        if (!authLoading && !isArtist) {
            router.push("/login");
        }
        return <FullPageSpinner />;
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex gap-2 mb-6">
                <TabButton active={activeTab === "portfolios"} onClick={() => setActiveTab("portfolios")}>
                    내 작품
                </TabButton>
                <TabButton active={activeTab === "exhibitions"} onClick={() => setActiveTab("exhibitions")}>
                    할인/기획전
                </TabButton>
            </div>

            {activeTab === "portfolios" ? (
                <>
                    <PortfolioListContent data={data as NonNullable<typeof data>} handleDelete={handleDelete} />
                    <Pagination meta={(data as NonNullable<typeof data>).meta} form={form} setForm={setForm} />
                </>
            ) : (
                <ExhibitionTab artistId={artist?.id as string} />
            )}
        </div>
    );
}
