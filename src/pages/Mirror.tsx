// src/pages/Mirror.tsx
import { useMemo, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { load, save } from "@/utils/storage";
import { useT } from "@/i18n";
import Insights from "./Insights";
import { cleanupDuplicates } from "@/utils/log";
import type { LogEntry, ActivityPhoto } from "@/types";
import { syncLogEntries } from "@/lib/database";
import { TimeFrameProvider } from "@/contexts/TimeFrameContext";
import RouteMap from "@/components/RouteMap";
import { ActivityPhotoGallery } from "@/components/activity/ActivityPhotoGallery";
import { stravaRichDataService } from "@/services/stravaRichDataService";

export default function Mirror() {
  const t = useT();
  const navigate = useNavigate();
  const [all, setAll] = useState<LogEntry[]>(() => load<LogEntry[]>("logEntries", []));
  const [photosByActivity, setPhotosByActivity] = useState<Record<string, ActivityPhoto[]>>({});

  const recent = useMemo(() => {
    const recentEntries = all.slice(0, 6);
    console.log('[Mirror] Recent entries with map data:', recentEntries.map(e => ({
      title: e.title,
      hasMapPolyline: !!e.mapPolyline,
      hasSummaryPolyline: !!e.mapSummaryPolyline,
      polylineLength: e.mapPolyline?.length,
      summaryPolylineLength: e.mapSummaryPolyline?.length,
      hasElevation: !!e.elevationStream,
      elevationPoints: e.elevationStream?.length,
      hasDistance: !!e.distanceStream,
      distancePoints: e.distanceStream?.length
    })));
    return recentEntries;
  }, [all]);

  useEffect(() => {
    let cancelled = false;
    syncLogEntries().then((entries) => {
      console.log('[Mirror] Synced entries:', entries.length);
      console.log('[Mirror] Sample entry full:', entries[0]);
      console.log('[Mirror] Sample entry map fields:', {
        hasMapPolyline: !!entries[0]?.mapPolyline,
        hasSummaryPolyline: !!entries[0]?.mapSummaryPolyline,
        mapPolylineValue: entries[0]?.mapPolyline,
        summaryPolylineValue: entries[0]?.mapSummaryPolyline
      });
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
      console.log('[Mirror] Import complete event received, resyncing...');
      const entries = await syncLogEntries();
      console.log('[Mirror] Resynced entries:', entries.length);
      setAll(entries);
    };

    window.addEventListener('log:import-complete', handleImport);
    return () => window.removeEventListener('log:import-complete', handleImport);
  }, []);

  // Load photos for recent activities
  useEffect(() => {
    async function loadPhotos() {
      const activitiesWithPhotos = recent.filter(e => e.hasPhotos && e.id);

      console.log('[Mirror] Activities with photos flag:', activitiesWithPhotos.length);
      console.log('[Mirror] Recent activities:', recent.map(e => ({
        id: e.id,
        title: e.title,
        hasPhotos: e.hasPhotos,
        hasSegments: e.hasSegments
      })));

      for (const activity of activitiesWithPhotos) {
        if (activity.id && !photosByActivity[activity.id]) {
          console.log(`[Mirror] Fetching photos for activity ${activity.id} (${activity.title})`);
          const photos = await stravaRichDataService.getActivityPhotos(activity.id);
          console.log(`[Mirror] Got ${photos.length} photos for activity ${activity.id}`);
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
    <>
    <TimeFrameProvider>
      <div className="grid" style={{ gap: 20 }}>
        {/* Header */}
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 className="h2" style={{ margin: 0 }}>{t("nav.mirror", "Mirror")}</h2>
            <div className="row" style={{ gap: 8 }}>
              <Link to="/calendar" className="btn">
                📅 {t("mirror.calendar", "Calendar")}
              </Link>
              <Link to="/season-plan" className="btn">
                📊 {t("mirror.season_plan", "Season Plan")}
              </Link>
              <Link to="/race-goals" className="btn primary">
                {t("mirror.race_goals", "Race Goals")}
              </Link>
            </div>
          </div>
        </section>

        {/* Insights Dashboard */}
        <Insights />

        {/* Recent Log */}
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 className="h2" style={{ margin: 0 }}>{t("mirror.recent_log", "Recent Log")}</h2>
            <Link to="/log" className="btn primary">
              {t("mirror.open_log", "View All Runs")}
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="small" style={{ color: "var(--muted)" }}>
              {t("mirror.no_runs", "No runs yet. Go to Settings to import your data or visit the Log page to add runs manually.")}
            </div>
          ) : (
            <div className="grid cols-3">
              {recent.map((e, i) => {
                const photos = e.id ? photosByActivity[e.id] : undefined;
                const hasPhotos = photos && photos.length > 0;

                return (
                  <article
                    key={i}
                    className="card"
                    onClick={() => e.id && navigate(`/activity/${e.id}`)}
                    style={{ cursor: e.id ? 'pointer' : 'default' }}
                  >
                    {hasPhotos ? (
                      <ActivityPhotoGallery photos={photos} compact />
                    ) : (e.mapSummaryPolyline || e.mapPolyline) ? (
                      <RouteMap
                        polyline={e.mapSummaryPolyline || e.mapPolyline}
                        width={280}
                        height={160}
                        className="mb-3"
                        durationMin={e.durationMin}
                        elevationStream={e.elevationStream}
                        distanceStream={e.distanceStream}
                        showElevation={true}
                      />
                    ) : null}
                    <div
                      className="h2"
                      style={{
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(el) => {
                        if (e.id) el.currentTarget.style.color = 'var(--bolt-teal)';
                      }}
                      onMouseLeave={(el) => {
                        el.currentTarget.style.color = 'var(--bolt-text)';
                      }}
                    >
                      {e.title || "Run"}
                    </div>
                    <div className="small" style={{ color: "var(--muted)" }}>
                      {e.dateISO} • {e.km ?? "—"} km
                    </div>
                    <div className="small" style={{ marginTop: 6 }}>
                      {e.durationMin ? `Duration: ${e.durationMin} min` : "Duration: —"} •{" "}
                      {e.hrAvg ? `HR: ${e.hrAvg} bpm` : "HR: —"}
                      {e.sportType && (
                        <>
                          {" • "}
                          <span style={{ color: 'var(--bolt-teal)' }}>{e.sportType}</span>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

    </TimeFrameProvider>

    </>
  );
}