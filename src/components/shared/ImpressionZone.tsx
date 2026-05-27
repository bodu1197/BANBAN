// @client-reason: IntersectionObserver for ad impression tracking requires browser APIs
"use client";

import { useImpressionTracker } from "@/hooks/useImpressionTracker";

interface ImpressionZoneProps {
    placement: string;
    children: React.ReactNode;
    className?: string;
}

export function ImpressionZone({ placement, children, className }: Readonly<ImpressionZoneProps>): React.ReactElement {
    const ref = useImpressionTracker(placement);
    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}
