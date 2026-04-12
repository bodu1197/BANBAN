// @client-reason: User interaction for similar tattoo search
"use client";

import { SimilarSearch } from "./similar-search";

export function AiStudioClient(): React.ReactElement {
    return (
        <div className="flex flex-col gap-4 p-4">
            <SimilarSearch />
        </div>
    );
}
