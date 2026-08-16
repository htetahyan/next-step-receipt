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
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F5F4EF] dark:bg-[#1F1F1E] overflow-hidden text-[#222222] dark:text-[#F5F4EF]">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
