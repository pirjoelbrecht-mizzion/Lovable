/**
 * Activity Photo Gallery Component
 * Displays Strava activity photos with swipe gallery and fullscreen modal
 */

import { useState } from 'react';
import type { ActivityPhoto } from '@/types';

interface ActivityPhotoGalleryProps {
  photos: ActivityPhoto[];
  compact?: boolean; // For thumbnail view in list
}

export function ActivityPhotoGallery({ photos, compact = false }: ActivityPhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  if (compact) {
    // Show only first photo as thumbnail for list view
    const firstPhoto = photos[0];
    return (
      <div
        className="activity-photo-thumbnail"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedIndex(0);
        }}
        style={{
          cursor: 'pointer',
          borderRadius: '8px',
          overflow: 'hidden',
          aspectRatio: '16/9',
          position: 'relative',
          marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        <img
          src={firstPhoto.urlThumbnail}
          alt={firstPhoto.caption || 'Activity photo'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.2s ease, filter 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        />
        {photos.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              backdropFilter: 'blur(4px)'
            }}
          >
            +{photos.length - 1}
          </div>
        )}
      </div>
    );
  }

  // Full gallery view for detail page
  return (
    <>
      <div
        className="activity-photo-gallery"
        style={{
          display: 'grid',
          gridTemplateColumns: photos.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}
      >
        {photos.map((photo, index) => (
          <div
            key={photo.id || index}
            className="photo-item"
            onClick={() => setSelectedIndex(index)}
            style={{
              cursor: 'pointer',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '4/3',
              position: 'relative',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            <img
              src={photo.urlThumbnail}
              alt={photo.caption || `Photo ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                const parent = e.currentTarget.parentElement as HTMLElement;
                parent.style.boxShadow = '0 0 20px rgba(var(--bolt-teal-rgb), 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                const parent = e.currentTarget.parentElement as HTMLElement;
                parent.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              }}
            />
            {photo.caption && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent)',
                  color: 'white',
                  padding: '8px',
                  fontSize: '12px'
                }}
              >
                {photo.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {selectedIndex !== null && (
        <div
          className="photo-modal"
          onClick={() => setSelectedIndex(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(null);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              fontSize: '32px',
              cursor: 'pointer',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>

          {selectedIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex - 1);
              }}
              style={{
                position: 'absolute',
                left: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '32px',
                cursor: 'pointer',
                width: '48px',
                height: '48px',
                borderRadius: '50%'
              }}
            >
              ‹
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <img
              src={photos[selectedIndex].urlFull}
              alt={photos[selectedIndex].caption || `Photo ${selectedIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 80px)',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
            {photos[selectedIndex].caption && (
              <p
                style={{
                  color: 'white',
                  marginTop: '16px',
                  fontSize: '16px',
                  textAlign: 'center'
                }}
              >
                {photos[selectedIndex].caption}
              </p>
            )}
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: '8px',
                fontSize: '14px'
              }}
            >
              {selectedIndex + 1} / {photos.length}
            </p>
          </div>

          {selectedIndex < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex + 1);
              }}
              style={{
                position: 'absolute',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '32px',
                cursor: 'pointer',
                width: '48px',
                height: '48px',
                borderRadius: '50%'
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
