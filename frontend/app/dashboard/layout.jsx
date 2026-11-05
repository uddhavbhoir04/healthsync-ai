import DashboardLayout from "@/components/layout/DashboardLayout";

export const metadata = {
  title: "Patient Dashboard — HealthSync AI",
  description: "Manage clinical tests, upcoming home phlebotomy visits, and verified medical reports.",
};

export default function Layout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

