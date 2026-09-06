import Sidebar from "@/components/Sidebar";
import { getCurrentUserProfile } from "@/app/actions/users";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  return (
    <div className="dashboard-layout flex h-screen w-full bg-[#F5F4EF] dark:bg-[#1F1F1E] overflow-hidden text-[#222222] dark:text-[#F5F4EF]">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5">
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
