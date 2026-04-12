import { formatPrice } from "@/lib/utils/format";

interface PriceDisplayProps {
  price: number;
  priceOrigin?: number;
  discountRate?: number;
}

export function PriceDisplay({
  price,
  priceOrigin,
  discountRate,
}: Readonly<PriceDisplayProps>): React.ReactElement {
  const hasDiscount = discountRate !== undefined && discountRate > 0;

  return (
    <div className="mt-1">
      {hasDiscount && priceOrigin !== undefined && priceOrigin > 0 && (
        <span className="text-xs text-muted-foreground line-through">
          {formatPrice(priceOrigin)}
        </span>
      )}
      {hasDiscount ? (
        <p className="text-xs">
          <span className="font-bold text-brand-primary">{discountRate}%</span>{" "}
          <span className="font-bold">{formatPrice(price)}</span>
        </p>
      ) : (
        <p className="text-xs font-bold">{formatPrice(price)}</p>
      )}
    </div>
  );
}
