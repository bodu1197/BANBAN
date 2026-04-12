/* eslint-disable max-lines-per-function */
// @client-reason: user interaction handlers for page navigation buttons
'use client';

import { useMemo } from "react";

interface PaginationMeta {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface PaginationForm {
    page: number;
    [key: string]: unknown;
}

interface PaginationProps {
    meta: PaginationMeta;
    form: PaginationForm;
    setForm: (form: PaginationForm) => void;
}

const BTN_BASE = "px-3 py-1.5 text-sm rounded border border-border transition-colors";
const BTN_HOVER = `${BTN_BASE} hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;
const BTN_DISABLED = `${BTN_BASE} opacity-40 cursor-not-allowed`;
const BTN_ACTIVE = `${BTN_BASE} bg-primary text-primary-foreground font-bold`;

function getNavBtnClass(disabled: boolean): string {
    return disabled ? BTN_DISABLED : BTN_HOVER;
}

function getPageBtnClass(isActive: boolean): string {
    return isActive ? BTN_ACTIVE : BTN_HOVER;
}

export default function Pagination({ meta, form, setForm }: Readonly<PaginationProps>): React.ReactElement | null {
    const pages = useMemo((): number[][] => {
        if (!meta?.last_page) return [];
        const unit = 10;
        const sections: number[][] = [];
        let items: number[] = [];
        for (let i = 1; i <= meta.last_page; i++) {
            items.push(i);
            if (items.length >= unit || i === meta.last_page) {
                sections.push(items);
                items = [];
            }
        }
        return sections;
    }, [meta]);

    const currentSection = useMemo((): number => {
        if (!meta?.current_page) return 0;
        return Math.floor((meta.current_page - 1) / 10);
    }, [meta]);

    function paginate(page: number): void {
        setForm({ ...form, page });
        globalThis.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (!meta?.last_page) return null;

    const isFirstPage = meta.current_page === 1;
    const isLastPage = meta.current_page === meta.last_page;
    // eslint-disable-next-line security/detect-object-injection
    const sectionPages = pages[currentSection] ?? [];

    return (
        <nav className="flex justify-center mt-8 mb-4" aria-label="페이지 이동">
            <ul className="flex items-center gap-1">
                <li>
                    <button
                        type="button"
                        className={getNavBtnClass(isFirstPage)}
                        onClick={(): void => { if (!isFirstPage) paginate(1); }}
                        disabled={isFirstPage}
                        aria-label="처음 페이지"
                    >처음</button>
                </li>
                <li>
                    <button
                        type="button"
                        className={getNavBtnClass(isFirstPage)}
                        onClick={(): void => { if (!isFirstPage) paginate(meta.current_page - 1); }}
                        disabled={isFirstPage}
                        aria-label="이전 페이지"
                    >이전</button>
                </li>
                {sectionPages.map((page) => (
                    <li key={page}>
                        <button
                            type="button"
                            className={getPageBtnClass(meta.current_page === page)}
                            onClick={(): void => { paginate(page); }}
                        >{page}</button>
                    </li>
                ))}
                <li>
                    <button
                        type="button"
                        className={getNavBtnClass(isLastPage)}
                        onClick={(): void => { if (!isLastPage) paginate(meta.current_page + 1); }}
                        disabled={isLastPage}
                        aria-label="다음 페이지"
                    >다음</button>
                </li>
                <li>
                    <button
                        type="button"
                        className={getNavBtnClass(isLastPage)}
                        onClick={(): void => { if (!isLastPage) paginate(meta.last_page); }}
                        disabled={isLastPage}
                        aria-label="마지막 페이지"
                    >마지막</button>
                </li>
            </ul>
        </nav>
    );
}
