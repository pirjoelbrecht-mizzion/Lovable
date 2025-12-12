import ACWRCard from '@/components/ACWRCard';

export default function ACWRDemo() {
  return (
    <div
      className="min-h-screen p-8"
      style={{ background: '#050a14' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            ACWR Card Component
          </h1>
          <p className="text-slate-400">
            Acute:Chronic Workload Ratio visualization with Dark HUD styling
          </p>
        </div>

        <div className="grid gap-8">
          {/* Default Card */}
          <ACWRCard />

          {/* Card with different ACWR value */}
          <ACWRCard currentACWR={1.52} />

          {/* Card with low ACWR */}
          <ACWRCard currentACWR={0.65} />
        </div>
      </div>
    </div>
  );
}
