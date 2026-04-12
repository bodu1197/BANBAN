import type { LucideIcon } from "lucide-react";

interface ContactInfoCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}

export function ContactInfoCard({
  icon: Icon,
  label,
  value,
  className = "rounded-lg border p-5",
}: Readonly<ContactInfoCardProps>): React.ReactElement {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
      <div>
        <h2 className="font-semibold">{label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
