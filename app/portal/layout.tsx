export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-[var(--background)] flex-col">
      <header className="bg-[var(--card-bg)] px-6 sm:px-8 py-4 shadow-xs border-b border-[var(--card-border)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D97757] text-[#F5F4EF] flex items-center justify-center font-serif font-bold text-sm">
              NS
            </div>
            <h1 className="text-base font-serif font-bold text-[var(--foreground)] tracking-tight">
              NextStep Travel & Tourism <span className="opacity-40 font-sans font-normal text-xs ml-1">• Customer Portal</span>
            </h1>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
