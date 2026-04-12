import CronProgressDashboard from "@/components/admin/CronProgressDashboard";

export const dynamic = "force-dynamic";

export default function LocationSeoAdminPage(): React.ReactElement {
  return (
    <CronProgressDashboard
      feature="위치×스타일 SEO"
      statusUrl="/api/admin/location-seo"
      runUrl="/api/admin/location-seo"
      acceptsItemId
      itemIdLabel="region_id::style"
    />
  );
}
