import { Line } from 'react-chartjs-2';
import type { GPXRouteAnalysis } from '@/utils/gpxParser';
import { formatTime } from '@/utils/gpxParser';

interface GPXElevationProfileProps {
  analysis: GPXRouteAnalysis;
  height?: number;
}

export default function GPXElevationProfile({ analysis, height = 300 }: GPXElevationProfileProps) {
  const segmentColors = {
    uphill: 'rgba(239, 68, 68, 0.6)',
    downhill: 'rgba(34, 197, 94, 0.6)',
    flat: 'rgba(59, 130, 246, 0.6)',
  };

  const datasets = [];

  const elevationData = {
    labels: analysis.elevationProfile.map(p => p.distance.toFixed(1)),
    datasets: [{
      label: 'Elevation',
      data: analysis.elevationProfile.map(p => p.elevation),
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (context: any) => `${context[0].label} km`,
          label: (context: any) => `${context.parsed.y}m elevation`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Distance (km)',
        },
        ticks: {
          maxTicksLimit: 10,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Elevation (m)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: '2px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Uphill
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'rgb(239, 68, 68)' }}>
            {analysis.uphillDistanceKm.toFixed(1)} km
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {formatTime(analysis.uphillTimeEstimate)}
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '8px',
            border: '2px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Downhill
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'rgb(34, 197, 94)' }}>
            {analysis.downhillDistanceKm.toFixed(1)} km
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {formatTime(analysis.downhillTimeEstimate)}
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '2px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Flat
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'rgb(59, 130, 246)' }}>
            {analysis.flatDistanceKm.toFixed(1)} km
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {formatTime(analysis.flatTimeEstimate)}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Distance</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{analysis.totalDistanceKm.toFixed(2)} km</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Ascent</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'rgb(239, 68, 68)' }}>
              +{analysis.totalElevationGainM}m
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Descent</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'rgb(34, 197, 94)' }}>
              -{analysis.totalElevationLossM}m
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Altitude</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{analysis.maxElevationM}m</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Min Altitude</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{analysis.minElevationM}m</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Est. Time</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatTime(analysis.totalTimeEstimate)}</div>
          </div>
        </div>
      </div>

      <div style={{ height: `${height}px`, position: 'relative' }}>
        <Line data={elevationData} options={options} />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Segments ({analysis.segments.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
          {analysis.segments.map((segment, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.75rem',
                backgroundColor: segmentColors[segment.type],
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  {idx + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{segment.type}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    {segment.distanceKm.toFixed(2)} km
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>
                  {segment.type === 'uphill' && `+${segment.elevationGainM}m`}
                  {segment.type === 'downhill' && `-${segment.elevationLossM}m`}
                  {segment.type === 'flat' && `${segment.gradeAvgPct.toFixed(1)}%`}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  Grade: {segment.gradeAvgPct > 0 ? '+' : ''}{segment.gradeAvgPct.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
