const BASE_BTN = "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const THEME_BTN = `${BASE_BTN} border-border bg-background text-foreground hover:bg-muted focus-visible:bg-muted`;
export const KAKAO_BTN = `${BASE_BTN} border-transparent bg-brand-kakao text-brand-kakao-foreground hover:brightness-95 focus-visible:brightness-95`;
export const PRIMARY_BTN = `${BASE_BTN} border-transparent bg-brand-primary text-white hover:opacity-90 focus-visible:opacity-90`;
