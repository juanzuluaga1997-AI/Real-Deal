export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-6 text-[#ffffff]">
      <div className="glass-surface w-full max-w-sm rounded-lg p-6">
        <div className="h-2 w-full overflow-hidden rounded-md bg-white/10">
          <div className="h-full w-2/5 animate-pulse rounded-md bg-[#2fb65d]" />
        </div>
        <p className="mt-4 text-sm font-medium text-[#ffffff]">{label}</p>
        <p className="mt-1 text-sm text-[#a8bdd0]">Preparing the founder workspace.</p>
      </div>
    </main>
  );
}
