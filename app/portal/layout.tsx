export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-[var(--background)] flex-col">
      <header className="bg-[var(--card-bg)] px-6 sm:px-8 py-4 shadow-xs border-b border-[var(--card-border)]">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-cover border border-[var(--card-border)]" />
            <h1 className="text-base font-serif font-bold text-[var(--foreground)] tracking-tight">
              NextStep Travel & Tourism <span className="opacity-40 font-sans font-normal text-xs ml-1">• Customer Portal</span>
            </h1>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full px-0 py-4">
        {children}
      </main>
    </div>
  );
}
