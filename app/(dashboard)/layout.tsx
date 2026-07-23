import Sidebar from "@/components/Sidebar";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <ImpersonationBanner />
        <main className="flex-1 p-6 text-white overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
