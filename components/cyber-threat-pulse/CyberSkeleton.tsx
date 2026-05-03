export default function CyberSkeleton() {
  return (
    <div className="min-h-screen bg-[#050a14] p-4 text-white md:ml-24 md:p-6">
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="mb-6 rounded-3xl border border-[#1f2b45] bg-[#0b1220] p-6">
          <div className="h-4 w-48 rounded-full bg-cyan-300/20" />
          <div className="mt-5 h-12 max-w-3xl rounded-2xl bg-slate-700/40" />
          <div className="mt-4 h-4 max-w-2xl rounded-full bg-slate-700/30" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-3xl border border-[#1f2b45] bg-slate-800/40" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="h-[520px] rounded-3xl border border-[#1f2b45] bg-slate-800/35" />
          <div className="space-y-6">
            <div className="h-64 rounded-3xl border border-[#1f2b45] bg-slate-800/35" />
            <div className="h-64 rounded-3xl border border-[#1f2b45] bg-slate-800/35" />
          </div>
        </div>
      </div>
    </div>
  );
}
