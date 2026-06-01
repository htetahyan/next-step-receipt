import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#F5F4EF] dark:bg-[#1F1F1E] overflow-hidden text-[#222222] dark:text-[#F5F4EF]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
