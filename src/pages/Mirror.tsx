import { useMemo, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { load, save } from "@/utils/storage";
import { useT } from "@/i18n";
import { cleanupDuplicates } from "@/utils/log";
import type { LogEntry, ActivityPhoto } from "@/types";
import { syncLogEntries } from "@/lib/database";
import { TimeFrameProvider } from "@/contexts/TimeFrameContext";
import RouteMap from "@/components/RouteMap";
import { stravaRichDataService } from "@/services/stravaRichDataService";
import MirrorInsights from "@/components/MirrorInsights";
import { Calendar, Target } from "lucide-react";
import "./Mirror.css";

export default function Mirror() {
  return (
    <TimeFrameProvider>
      <MirrorContent />
    </TimeFrameProvider>
  );
}

function MirrorContent() {
  const t = useT();
  const navigate = useNavigate();
  const [all, setAll] = useState<LogEntry[]>(() => load<LogEntry[]>("logEntries", []));
  const [photosByActivity, setPhotosByActivity] = useState<Record<string, ActivityPhoto[]>>({});

  const recent = useMemo(() => {
    return all.slice(0, 4);
  }, [all]);

  useEffect(() => {
    let cancelled = false;
    syncLogEntries().then((entries) => {
      if (!cancelled) {
        setAll(entries);
      }
    }).catch((err) => {
      console.error('Failed to sync log entries:', err);
      if (!cancelled) {
        const cleaned = cleanupDuplicates(all);
        if (cleaned.length !== all.length) {
          save('logEntries', cleaned);
          setAll(cleaned);
        }
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleImport = async () => {
      const entries = await syncLogEntries();
      setAll(entries);
    };

    window.addEventListener('log:import-complete', handleImport);
    return () => window.removeEventListener('log:import-complete', handleImport);
  }, []);

  useEffect(() => {
    async function loadPhotos() {
      const activitiesWithPhotos = recent.filter(e => e.hasPhotos && e.id);

      for (const activity of activitiesWithPhotos) {
        if (activity.id && !photosByActivity[activity.id]) {
          const photos = await stravaRichDataService.getActivityPhotos(activity.id);
          if (photos.length > 0) {
            setPhotosByActivity(prev => ({
              ...prev,
              [activity.id!]: photos
            }));
          }
        }
      }
    }

    loadPhotos();
  }, [recent]);

  return (
    <div className="mirror-page">
      <section className="mirror-card">
        <div className="mirror-header">
          <div className="mirror-header-left">
            <div className="mirror-header-icon">
              <Target size={20} />
            </div>
            <h1 className="mirror-header-title">{t("nav.mirror", "Mirror")}</h1>
          </div>
          <nav className="mirror-header-nav">
            <Link to="/calendar" className="mirror-nav-btn">
              <Calendar size={16} />
              {t("mirror.calendar", "Calendar")}
            </Link>
            <Link to="/season-plan" className="mirror-nav-btn">
              <Calendar size={16} />
              {t("mirror.season_plan", "Season Plan")}
            </Link>
          </nav>
        </div>
      </section>

      <MirrorInsights />

      <section className="mirror-card">
        <div className="mirror-recent-header">
          <h2 className="mirror-recent-title">{t("mirror.recent_log", "Recent log")}</h2>
          <Link to="/log" className="mirror-view-all-btn">
            {t("mirror.open_log", "View All Runs")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="mirror-empty-state">
            <p>
              {t("mirror.no_runs", "No runs yet. Go to Settings to import your data or visit the Log page to add runs manually.")}
            </p>
          </div>
        ) : (
          <div className="mirror-activities-grid">
            {recent.map((e, i) => {
              const photos = e.id ? photosByActivity[e.id] : undefined;
              const hasPhotos = photos && photos.length > 0;

              return (
                <article
                  key={i}
                  className="mirror-activity-card"
                  onClick={() => e.id && navigate(`/activity/${e.id}`)}
                >
                  <div className="mirror-activity-media">
                    {hasPhotos ? (
                      <>
                        <img
                          src={photos[0].urls?.medium || photos[0].urls?.thumbnail || ''}
                          alt={e.title || 'Activity photo'}
                        />
                        {photos.length > 1 && (
                          <span className="mirror-photo-count">+{photos.length - 1}</span>
                        )}
                      </>
                    ) : (e.mapSummaryPolyline || e.mapPolyline) ? (
                      <RouteMap
                        polyline={e.mapSummaryPolyline || e.mapPolyline}
                        width={400}
                        height={160}
                        durationMin={e.durationMin}
                        elevationStream={e.elevationStream}
                        distanceStream={e.distanceStream}
                        showElevation={false}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'rgba(0, 240, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: 13 }}>No map data</span>
                      </div>
                    )}
                  </div>
                  <div className="mirror-activity-info">
                    <h3 className="mirror-activity-title">{e.title || "Run"}</h3>
                    <p className="mirror-activity-date">
                      {e.dateISO} = {e.km ?? "-"} km
                    </p>
                    <p className="mirror-activity-stats">
                      {e.durationMin ? `Duration: ${e.durationMin} min` : "Duration: -"} - {" "}
                      {e.hrAvg ? `HR: ${e.hrAvg}bpm` : "HR: -"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
