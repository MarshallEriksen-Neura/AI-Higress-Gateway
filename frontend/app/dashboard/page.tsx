import DashboardOverviewPage, {
  metadata as dashboardOverviewMetadata,
} from "./overview/page";

export const metadata = dashboardOverviewMetadata;

export default async function DashboardPage() {
  return DashboardOverviewPage();
}
