import CronProgressDashboard from "@/components/admin/CronProgressDashboard";

export const dynamic = "force-dynamic";

export default function BlogCronAdminPage(): React.ReactElement {
  return (
    <CronProgressDashboard
      feature="블로그"
      statusUrl="/api/admin/blog-cron"
      runUrl="/api/admin/blog-cron"
      acceptsItemId
      itemIdLabel="포트폴리오 UUID"
    />
  );
}
