import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Venue } from "@/lib/firestore";

interface VenueMapProps {
  venue: Venue;
  className?: string;
}

// Create custom bowling-themed marker
const createVenueIcon = (rating: number) => {
  const getMarkerColor = (rating: number) => {
    if (rating >= 4.5) return '#22c55e'; // Green for excellent
    if (rating >= 4.0) return '#3b82f6'; // Blue for very good
    if (rating >= 3.5) return '#f59e0b'; // Orange for good
    if (rating >= 3.0) return '#ef4444'; // Red for fair
    return '#6b7280'; // Gray for poor/no rating
  };
  
  const color = getMarkerColor(rating);
  
  return L.divIcon({
    className: 'custom-venue-marker',
    html: `
      <div style="
        background: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 20px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        ">
          🎳
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

export default function VenueMap({ venue, className = "" }: VenueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Get coordinates (prefer new format, fallback to legacy)
    const lat = venue.location?.latitude || venue.lat;
    const lng = venue.location?.longitude || venue.lng;

    if (!lat || !lng) {
      return;
    }

    // Initialize map centered on the venue with interactions disabled
    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      dragging: false,
      zoomControl: false
    }).setView([lat, lng], 15);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);
    
    // Style the map container
    map.getContainer().style.borderRadius = '12px';
    map.getContainer().style.overflow = 'hidden';
    map.getContainer().style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';

    // Add marker for the venue
    const marker = L.marker([lat, lng], {
      icon: createVenueIcon(venue.avgRating)
    }).addTo(map);

    // Add popup with venue info
    const popupContent = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 0;">
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #1f2937;">
          ${venue.name}
        </div>
        <div style="color: #6b7280; font-size: 14px; margin-bottom: 6px;">
          ${venue.address}
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="color: #f59e0b; font-size: 14px;">★</span>
          <span style="font-weight: 500; color: #374151; font-size: 14px;">
            ${venue.avgRating.toFixed(1)} (${venue.reviewCount} reviews)
          </span>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      offset: [0, -10],
      closeButton: false,
      autoClose: false,
      closeOnClick: false
    }).openPopup();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [venue]);

  return (
    <div
      ref={mapRef}
      className={`w-full h-64 ${className} relative z-0`}
      data-testid="venue-map"
      role="img"
      aria-label={`Map showing location of ${venue.name}`}
    />
  );
}