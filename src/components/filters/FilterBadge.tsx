// @client-reason: Receives onRemove callback prop for badge click handler
"use client";

import { memo } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilterBadgeProps {
  label: string;
  onRemove: () => void;
}

export const FilterBadge = memo(function FilterBadge({
  label,
  onRemove,
}: Readonly<FilterBadgeProps>): React.ReactElement {
  return (
    <Badge
      variant="secondary"
      className="cursor-pointer"
      onClick={onRemove}
      data-testid="filter-badge"
    >
      {label}
      <X className="ml-1 h-3 w-3" />
    </Badge>
  );
});
