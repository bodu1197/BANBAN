import CronProgressDashboard from "@/components/admin/CronProgressDashboard";

export const dynamic = "force-dynamic";

export default function InsightCronAdminPage(): React.ReactElement {
  return (
    <CronProgressDashboard
      feature="아티스트 인사이트"
      statusUrl="/api/admin/insight-cron"
      runUrl="/api/admin/insight-cron"
      acceptsItemId
      itemIdLabel="아티스트 UUID"
    />
  );
}
