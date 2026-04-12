/**
 * "AD" badge overlay for promoted portfolios/artists.
 * Renders a small pill in the top-left corner of the card.
 */
export function AdBadge(): React.ReactElement {
    return (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-lg backdrop-blur-sm">
            AD
        </span>
    );
}
