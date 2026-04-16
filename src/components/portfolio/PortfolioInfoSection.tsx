interface PortfolioInfoSectionProps {
  title: string;
  address: string;
  price: number | null;
  priceOrigin: number | null;
  discountRate: number | null;
  /** Server-side에서 parseDescriptionText로 미리 sanitize된 HTML. 빈값이면 noDescriptionLabel 사용. */
  descriptionHtml: string;
  currencyUnit?: string;
  discountEventLabel?: string;
}

// eslint-disable-next-line complexity
export function PortfolioInfoSection({
  title, address, price, priceOrigin, discountRate, descriptionHtml,
  currencyUnit = "",
  discountEventLabel = "Discount Event",
}: Readonly<PortfolioInfoSectionProps>): React.ReactElement {
  const hasDiscount = Boolean(discountRate && discountRate > 0);
  const showOriginalPrice = Boolean(priceOrigin && priceOrigin > 0 && priceOrigin !== price);

  return (
    <>
      <div className="px-4 py-4">
        <h2 className="mb-1 text-lg font-bold">{title}</h2>
        {address ? <p className="mb-3 text-sm text-muted-foreground">{address}</p> : null}
        <div className="flex flex-wrap items-baseline gap-2">
          {showOriginalPrice ? (
            <span className="text-sm text-muted-foreground line-through">{priceOrigin?.toLocaleString()}{currencyUnit}</span>
          ) : null}
          {hasDiscount ? <span className="font-bold text-red-500">{discountRate}%</span> : null}
          <span className="text-xl font-bold">{(price ?? 0).toLocaleString()}{currencyUnit}</span>
        </div>
        {hasDiscount ? (
          <button
            type="button"
            className="mt-3 cursor-pointer rounded bg-red-600 px-4 py-2 text-sm font-bold text-white drop-shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {discountEventLabel}
          </button>
        ) : null}
      </div>
      <div className="border-t px-4 py-4">
        <div className="whitespace-pre-wrap text-sm leading-relaxed [&_img]:hidden" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
      </div>
    </>
  );
}
