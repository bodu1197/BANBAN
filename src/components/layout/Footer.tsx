import Link from "next/link";
import { STRINGS } from "@/lib/strings";

function FooterNav({ f }: Readonly<{ f: typeof STRINGS.footer }>): React.ReactElement {
  const linkClass = "transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none";
  return (
    <nav
      className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground md:gap-6"
      aria-label="Footer navigation"
    >
      <Link href={"/about"} className={linkClass}>{f.about}</Link>
      <Link href={"/terms"} className={linkClass}>{f.terms}</Link>
      <Link href={"/privacy"} className={linkClass}>{f.privacy}</Link>
      <Link href={"/refund-policy"} className={linkClass}>반품/환불</Link>
      <Link href={"/contact"} className={linkClass}>{f.contact}</Link>
      <Link href={"/partnership"} className={linkClass}>{f.partnership}</Link>
    </nav>
  );
}

export function Footer(): React.ReactElement {
  const currentYear = new Date().getFullYear();
  const copyright = STRINGS.footer.copyright.replace("2024", String(currentYear));
  const f = STRINGS.footer;

  return (
    <footer className="border-t bg-muted/50">
      <div className="mx-auto max-w-[767px] px-4 py-8">
        <FooterNav f={f} />
        <details className="group mt-6 text-center text-xs text-muted-foreground/70">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 select-none text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            {f.companyName}
            <span className="transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="mt-2 space-y-1">
            <p>{f.companyAddress}</p>
            <p>{f.companyContact}</p>
            <p>{f.companyRefund}</p>
            <p>{f.companyResponsibility}</p>
            <p>{f.companyComplaint}</p>
          </div>
        </details>
        <p className="mt-4 text-center text-xs text-muted-foreground">{copyright}</p>
      </div>
    </footer>
  );
}
