export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] dark:bg-[#0f172a] flex-col">
      <header className="bg-white px-8 py-4 shadow-sm border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <h1 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Invoice Portal</h1>
      </header>
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
