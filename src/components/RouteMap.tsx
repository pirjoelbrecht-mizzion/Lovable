import { useEffect, useRef, useState } from 'react';

interface RouteMapProps {
  polyline?: string;
  width?: number;
  height?: number;
  className?: string;
  durationMin?: number;
  elevationStream?: number[];
  distanceStream?: number[];
  showElevation?: boolean;
}

interface Coord {
  lat: number;
  lng: number;
}

function decodePolyline(encoded: string): Coord[] {
  const coords: Coord[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coords;
}

function getBounds(coords: Coord[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  };
}

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
}

function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  return {
    lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: x / Math.pow(2, zoom) * 360 - 180
  };
}

function getOptimalZoom(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, width: number, height: number): number {
  const WORLD_DIM = { height: 256, width: 256 };
  const ZOOM_MAX = 18;

  function latRad(lat: number) {
    const sin = Math.sin(lat * Math.PI / 180);
    const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
    return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
  }

  function zoom(mapPx: number, worldPx: number, fraction: number) {
    return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
  }

  const latFraction = (latRad(bounds.maxLat) - latRad(bounds.minLat)) / Math.PI;
  const lngDiff = bounds.maxLng - bounds.minLng;
  const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

  const latZoom = zoom(height, WORLD_DIM.height, latFraction);
  const lngZoom = zoom(width, WORLD_DIM.width, lngFraction);

  return Math.min(latZoom, lngZoom, ZOOM_MAX) - 1;
}

export default function RouteMap({
  polyline,
  width = 300,
  height = 200,
  className = '',
  durationMin,
  elevationStream,
  distanceStream,
  showElevation = true
}: RouteMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elevationCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useEffect(() => {
    if (!polyline || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = decodePolyline(polyline);
    if (coords.length < 2) return;

    const bounds = getBounds(coords);
    const zoom = getOptimalZoom(bounds, width, height);

    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;

    const centerTile = latLngToTile(centerLat, centerLng, zoom);

    const tilesX = Math.ceil(width / 256) + 2;
    const tilesY = Math.ceil(height / 256) + 2;

    const startX = centerTile.x - Math.floor(tilesX / 2);
    const startY = centerTile.y - Math.floor(tilesY / 2);

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    let loadedTiles = 0;
    const totalTiles = tilesX * tilesY;

    const latLngToPixel = (lat: number, lng: number): { x: number; y: number } => {
      const scale = Math.pow(2, zoom);
      const worldCoordX = (lng + 180) / 360 * 256 * scale;
      const worldCoordY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 256 * scale;

      const centerWorldX = (centerLng + 180) / 360 * 256 * scale;
      const centerWorldY = (1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * 256 * scale;

      return {
        x: width / 2 + (worldCoordX - centerWorldX),
        y: height / 2 + (worldCoordY - centerWorldY)
      };
    };

    for (let dy = 0; dy < tilesY; dy++) {
      for (let dx = 0; dx < tilesX; dx++) {
        const tileX = startX + dx;
        const tileY = startY + dy;

        if (tileX < 0 || tileY < 0 || tileX >= Math.pow(2, zoom) || tileY >= Math.pow(2, zoom)) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const tileLat = tileToLatLng(tileX, tileY, zoom).lat;
          const tileLng = tileToLatLng(tileX, tileY, zoom).lng;
          const pixelPos = latLngToPixel(tileLat, tileLng);

          ctx.drawImage(img, pixelPos.x, pixelPos.y, 256, 256);

          loadedTiles++;
          if (loadedTiles === totalTiles) {
            drawRoute();
          }
        };

        img.onerror = () => {
          loadedTiles++;
          if (loadedTiles === totalTiles) {
            drawRoute();
          }
        };

        img.src = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
      }
    }

    const drawRoute = () => {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 2;

      ctx.strokeStyle = '#FF4500';
      ctx.beginPath();
      coords.forEach((coord, i) => {
        const { x, y } = latLngToPixel(coord.lat, coord.lng);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      const startPos = latLngToPixel(coords[0].lat, coords[0].lng);
      ctx.fillStyle = '#4CAF50';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const endPos = latLngToPixel(coords[coords.length - 1].lat, coords[coords.length - 1].lng);
      ctx.fillStyle = '#FF4500';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(endPos.x, endPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      setTilesLoaded(true);
    };

  }, [polyline, width, height, durationMin]);

  useEffect(() => {
    console.log('[RouteMap] Elevation effect triggered:', {
      showElevation,
      hasElevationStream: !!elevationStream,
      hasDistanceStream: !!distanceStream,
      elevationLength: elevationStream?.length,
      distanceLength: distanceStream?.length,
      hasCanvas: !!elevationCanvasRef.current
    });

    if (!showElevation || !elevationStream || !distanceStream || !elevationCanvasRef.current) return;
    if (elevationStream.length < 2) {
      console.log('[RouteMap] Elevation stream too short:', elevationStream.length);
      return;
    }

    const canvas = elevationCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const elevationHeight = 100;
    const padding = 30;
    const drawWidth = width - padding * 2;
    const drawHeight = elevationHeight - padding - 10;

    ctx.clearRect(0, 0, width, elevationHeight);

    const minElevation = Math.min(...elevationStream);
    const maxElevation = Math.max(...elevationStream);
    const elevationRange = maxElevation - minElevation || 1;
    const maxDistance = distanceStream[distanceStream.length - 1] / 1000;

    const gradient = ctx.createLinearGradient(0, 10, 0, elevationHeight - 10);
    gradient.addColorStop(0, 'rgba(255, 69, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 69, 0, 0.02)');

    ctx.beginPath();
    ctx.moveTo(padding, elevationHeight - 10);

    elevationStream.forEach((elevation, i) => {
      const x = padding + (distanceStream[i] / 1000 / maxDistance) * drawWidth;
      const y = elevationHeight - 10 - ((elevation - minElevation) / elevationRange) * drawHeight;
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(padding + drawWidth, elevationHeight - 10);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    elevationStream.forEach((elevation, i) => {
      const x = padding + (distanceStream[i] / 1000 / maxDistance) * drawWidth;
      const y = elevationHeight - 10 - ((elevation - minElevation) / elevationRange) * drawHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.font = '11px -apple-system, system-ui, sans-serif';

    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(minElevation)}m`, 5, elevationHeight - 12);

    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(maxElevation)}m`, width - 5, 20);

    ctx.textAlign = 'center';
    ctx.fillText(`${maxDistance.toFixed(1)} km`, width / 2, elevationHeight - 2);

  }, [showElevation, elevationStream, distanceStream, width]);

  if (!polyline) {
    return null;
  }

  const showElevationProfile = showElevation && elevationStream && distanceStream && elevationStream.length > 0;

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', width: '100%', maxWidth: `${width}px` }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          borderRadius: showElevationProfile ? '8px 8px 0 0' : '8px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderBottom: showElevationProfile ? 'none' : '1px solid #e0e0e0',
          display: 'block',
          width: '100%',
          height: 'auto',
          maxWidth: `${width}px`
        }}
      />
      {showElevationProfile && (
        <canvas
          ref={elevationCanvasRef}
          width={width}
          height={100}
          style={{
            borderRadius: '0 0 8px 8px',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderTop: '1px solid #f0f0f0',
            display: 'block',
            width: '100%',
            height: 'auto',
            maxWidth: `${width}px`
          }}
        />
      )}
    </div>
  );
}
