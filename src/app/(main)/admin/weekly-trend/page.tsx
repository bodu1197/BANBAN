import CronProgressDashboard from "@/components/admin/CronProgressDashboard";

export const dynamic = "force-dynamic";

export default function WeeklyTrendAdminPage(): React.ReactElement {
  return (
    <CronProgressDashboard
      feature="주간 트렌드"
      statusUrl="/api/admin/weekly-trend"
      runUrl="/api/admin/weekly-trend"
      acceptsItemId
      itemIdLabel="주차 (YYYY-MM-DD)"
    />
  );
}
