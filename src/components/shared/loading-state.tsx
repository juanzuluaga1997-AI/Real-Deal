export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11100d] p-6 text-[#f8f6f0]">
      <div className="glass-surface w-full max-w-sm rounded-lg p-6">
        <div className="h-2 w-full overflow-hidden rounded-md bg-white/10">
          <div className="h-full w-2/5 animate-pulse rounded-md bg-[#6ee7b7]" />
        </div>
        <p className="mt-4 text-sm font-medium text-[#fffaf0]">{label}</p>
        <p className="mt-1 text-sm text-[#c9c1ad]">Preparing the founder workspace.</p>
      </div>
    </main>
  );
}
