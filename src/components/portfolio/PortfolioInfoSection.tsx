interface PortfolioInfoSectionProps {
  address: string;
  /** Server-side에서 parseDescriptionText로 미리 sanitize된 HTML. 빈값이면 noDescriptionLabel 사용. */
  descriptionHtml: string;
}

export function PortfolioInfoSection({
  address,
  descriptionHtml,
}: Readonly<PortfolioInfoSectionProps>): React.ReactElement {
  return (
    <div className="px-4 py-4">
      {address ? <p className="mb-3 text-sm text-muted-foreground">{address}</p> : null}
      <div
        className="whitespace-pre-wrap text-sm leading-relaxed [&_img]:hidden"
        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
      />
    </div>
  );
}
