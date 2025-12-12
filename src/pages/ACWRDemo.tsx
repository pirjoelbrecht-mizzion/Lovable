import { Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import ACWRCard from '@/components/ACWRCard';

export default function ACWRDemo() {
  return (
    <div
      className="min-h-screen p-8"
      style={{ background: '#050a14' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            ACWR Live Dashboard
          </h1>
          <p className="text-slate-400 mb-4">
            Acute:Chronic Workload Ratio with real-time data and personalized zones
          </p>
          <div
            className="p-4 rounded-lg"
            style={{
              background: 'rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <Info size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  ACWR is calculated from your training data in the <span className="text-cyan-400 font-semibold">derived_metrics_weekly</span> table.
                  The card automatically updates when you import new activities or log runs.
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  Data is fetched from Supabase and personalized zones are calculated from your training history.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Default View (4 weeks)
            </h2>
            <ACWRCard />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Extended View (3 months)
            </h2>
            <ACWRCard defaultTimeFrame="3m" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Full Year View (12 months)
            </h2>
            <ACWRCard defaultTimeFrame="12m" />
          </div>
        </div>

        <div className="mt-8">
          <div
            className="p-6 rounded-xl"
            style={{
              background: 'rgba(11, 18, 33, 0.8)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-3">
              Features
            </h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Real-time data from Supabase with automatic refresh on activity import</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Personalized zones calculated from athlete baselines and training history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Multiple timeframe views (7d, 14d, 4w, 3m, 12m) with interactive selection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Contextual feedback based on current ACWR zone and training load</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Educational modal explaining ACWR with personalized insights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Visual zone indicators showing both universal and personalized optimal ranges</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Loading, error, and empty states with helpful user guidance</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            to="/insights"
            className="p-6 rounded-xl transition-all hover:scale-105"
            style={{
              background: 'rgba(11, 18, 33, 0.8)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <h4 className="text-white font-semibold mb-2">View Full Insights</h4>
            <p className="text-slate-400 text-sm">
              See detailed ACWR charts, athlete baselines, and comprehensive workload analysis
            </p>
          </Link>

          <Link
            to="/mirror"
            className="p-6 rounded-xl transition-all hover:scale-105"
            style={{
              background: 'rgba(11, 18, 33, 0.8)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <h4 className="text-white font-semibold mb-2">Training Mirror</h4>
            <p className="text-slate-400 text-sm">
              Comprehensive training analytics with weekly metrics and performance trends
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
