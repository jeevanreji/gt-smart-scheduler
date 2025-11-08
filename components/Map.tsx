declare global {
  interface Window {
    google: any;
  }
}

import React, { useEffect, useRef } from 'react';
import { Location, Room } from '../types';
import { AVAILABLE_ROOMS } from '../constants';

interface MapProps {
  center: Location;
  highlight?: Location;
  userLocation?: Location | null;
  zoom?: number;
  directions?: {
    origin: Location;
    destination: Location;
  }
}

const MapComponent: React.FC<MapProps> = ({ center, highlight, userLocation, zoom = 15, directions }) => {
  const ref = useRef<HTMLDivElement>(null);
  const directionsRendererRef = useRef<any>(null);

  useEffect(() => {
    if (ref.current && window.google) {
      const map = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        disableDefaultUI: true,
        styles: [ { elementType: 'geometry', stylers: [{ color: '#242f3e' }] }, { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] }, { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }, { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] }, { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] }, { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] }, { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] }, { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] }, { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] }, { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] }, { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] }, { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] }, { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] }, { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] }, { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] }, { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] }, { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] }, { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }, ],
      });

      // Initialize directions renderer once
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true, // We'll use our own custom markers
            polylineOptions: {
                strokeColor: '#06b6d4', // Cyan color for the route
                strokeWeight: 5,
                strokeOpacity: 0.8,
            }
        });
      }
      directionsRendererRef.current.setMap(map);

      const bounds = new window.google.maps.LatLngBounds();
      
      const buildingIcon = { path: 'M12 2L2 7v13h20V7L12 2zm-2 16h-2v-4h2v4zm4 0h-2v-4h2v4zm4 0h-2v-4h2v4zm0-6h-2v-2h2v2zm-4-2h-2v2H8V9H6V7h12v2h-2v2z', fillColor: '#10b981', fillOpacity: 1, strokeWeight: 0, rotation: 0, scale: 1, anchor: new window.google.maps.Point(12, 12), };
      const uniqueBuildings: Room[] = Array.from(new Map(AVAILABLE_ROOMS.map(room => [room.building, room])).values());
      uniqueBuildings.forEach(building => {
        new window.google.maps.Marker({ position: building.location, map, title: building.building, icon: buildingIcon });
        if (!directions) bounds.extend(building.location); // Only extend bounds if not showing directions
      });

      if (userLocation) {
        new window.google.maps.Marker({ position: userLocation, map, title: 'Your Location', icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, } });
        if (!directions) bounds.extend(userLocation);
      }

      if (highlight) {
        new window.google.maps.Marker({ position: highlight, map, title: 'Proposed Location', animation: window.google.maps.Animation.DROP, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#2dd4bf', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2.5 } });
        if (!directions) bounds.extend(highlight);
      }

      // Handle directions rendering
      if (directions) {
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route({
            origin: directions.origin,
            destination: directions.destination,
            travelMode: window.google.maps.TravelMode.WALKING,
        }, (result: any, status: any) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
                directionsRendererRef.current.setDirections(result);
                // Markers for start and end of route
                new window.google.maps.Marker({ position: directions.origin, map, title: 'Your Location', icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 } });
                new window.google.maps.Marker({ position: directions.destination, map, title: 'Destination', icon: buildingIcon });
            } else {
                console.error(`Directions request failed due to ${status}`);
            }
        });
      } else {
        // Auto-zoom and center the map to fit all markers if not showing directions
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
        }
      }
    }
  }, [center, zoom, highlight, userLocation, directions]);

  return <div ref={ref} className="w-full h-full" />;
};

export default MapComponent;
