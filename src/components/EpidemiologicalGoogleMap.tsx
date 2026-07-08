import { APIProvider, Map, AdvancedMarker, useMap, useAdvancedMarkerRef, InfoWindow } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Layers, Globe } from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Premium high-contrast slate-dark blueprint style for Google Maps
const MAP_STYLES = [
  { "elementType": "geometry", "stylers": [{ "color": "#020617" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#020617" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#334155" }, { "weight": 1.5 }] },
  { "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "landscape", "elementType": "geometry.fill", "stylers": [{ "color": "#0b0f19" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#121b2d" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020813" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#334155" }] }
];

// Cache client-side for fetched GeoJSONs to keep performance incredibly smooth
const geoJsonCache: Record<string, any> = {};

async function fetchGeoJson(url: string) {
  if (geoJsonCache[url]) {
    return geoJsonCache[url];
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load map data");
  const data = await res.json();
  geoJsonCache[url] = data;
  return data;
}

// Helpers to extract names from GeoJSON features with multi-schema resilience
const getStateName = (feature: google.maps.Data.Feature): string => {
  return (
    (feature.getProperty("ST_NM") as string) ||
    (feature.getProperty("State_Name") as string) ||
    (feature.getProperty("state_name") as string) ||
    (feature.getProperty("NAME") as string) ||
    (feature.getProperty("NAME_1") as string) ||
    ""
  );
};

const getDistrictName = (feature: google.maps.Data.Feature): string => {
  return (
    (feature.getProperty("district") as string) ||
    (feature.getProperty("district_name") as string) ||
    (feature.getProperty("NAME_2") as string) ||
    (feature.getProperty("NAME") as string) ||
    ""
  );
};

const getDistrictStateName = (feature: google.maps.Data.Feature): string => {
  return (
    (feature.getProperty("state") as string) ||
    (feature.getProperty("state_name") as string) ||
    (feature.getProperty("NAME_1") as string) ||
    ""
  );
};

// Calculate LatLng bounds of a GeoJSON feature geometry dynamically
function getFeatureBounds(feature: google.maps.Data.Feature) {
  const bounds = new google.maps.LatLngBounds();
  feature.getGeometry().forEachLatLng((latLng) => {
    bounds.extend(latLng);
  });
  return bounds;
}

// Geographic GPS centers for fallback when fitting bounds is unavailable
const STATE_CENTERS: Record<string, { lat: number; lng: number }> = {
  "ANDHRA PRADESH": { lat: 15.9129, lng: 79.7400 },
  "BIHAR": { lat: 25.0961, lng: 85.3131 },
  "GUJARAT": { lat: 22.2587, lng: 71.1924 },
  "HARYANA": { lat: 29.0588, lng: 76.0856 },
  "ASSAM": { lat: 26.2006, lng: 92.9376 },
  "NAGALAND": { lat: 26.1584, lng: 94.5624 },
  "TELANGANA": { lat: 17.2500, lng: 79.1000 },
  "TAMIL NADU": { lat: 13.0000, lng: 80.0000 },
  "UTTAR PRADESH": { lat: 26.8500, lng: 80.9400 }
};

interface PhcMarkerProps {
  phc: any;
  position: { lat: number; lng: number };
  size: number;
  zIndex: number;
  setMarkerRef: (marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => void;
  onClick: (phc: any) => void;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
}

// Module-level styling helpers
const getMarkerSize = (z: number) => {
  if (z < 6) return 10;
  if (z < 9) return 14;
  if (z < 12) return 20;
  if (z < 14) return 26;
  return 32;
};

const getZIndex = (phc: any, isSelected: boolean, isHovered: boolean) => {
  if (isSelected) return 1000;
  if (isHovered) return 500;
  if (phc.riskAnalysis.status === "red") return 100;
  if (phc.riskAnalysis.status === "amber") return 50;
  return 10;
};

// Custom interactive facility marker component
const PhcMarker: React.FC<PhcMarkerProps> = ({
  phc,
  position,
  size,
  zIndex,
  setMarkerRef,
  onClick,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    if (marker) {
      setMarkerRef(marker, phc.id);
    }
    return () => {
      setMarkerRef(null, phc.id);
    };
  }, [marker, phc.id, setMarkerRef]);

  const color = phc.riskAnalysis.status === "red"
    ? "#ef4444"
    : phc.riskAnalysis.status === "amber"
      ? "#f59e0b"
      : "#10b981";

  const glowColor = phc.riskAnalysis.status === "red"
    ? "rgba(239, 68, 68, 0.7)"
    : phc.riskAnalysis.status === "amber"
      ? "rgba(245, 158, 11, 0.7)"
      : "rgba(16, 185, 129, 0.7)";

  return (
    <AdvancedMarker
      ref={markerRef}
      position={position}
      onClick={() => onClick(phc)}
      onMouseEnter={() => onMouseEnter(phc.id)}
      onMouseLeave={onMouseLeave}
      zIndex={zIndex}
      collisionBehavior="OPTIONAL_AND_HIDE_LOWER_PRIORITY"
    >
      {/*
        IMPORTANT: this outer div is the direct child AdvancedMarker measures
        to anchor the marker to its lat/lng. It must stay a fixed, untransformed
        size — never put a hover/scale transform here, or the changing
        bounding box will fight with the library's own repositioning and
        cause the marker to jitter/shift while hovered.
      */}
      <div
        className="relative flex items-center justify-center cursor-pointer"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        {/* All visual scaling happens on this inner element instead, which
            AdvancedMarker never measures, so it can grow/shrink freely
            without moving the pin. */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-transform duration-200 ${
            isSelected ? "scale-125" : "hover:scale-125"
          }`}
        >
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: "120%",
              height: "120%",
              backgroundColor: color,
              opacity: 0.35,
              boxShadow: `0 0 10px ${glowColor}`,
            }}
          />
          <div
            className="absolute rounded-full border border-slate-950 shadow-md"
            style={{
              width: "60%",
              height: "60%",
              backgroundColor: color,
            }}
          />
          <div
            className="absolute rounded-full bg-white opacity-80"
            style={{
              width: "20%",
              height: "20%",
            }}
          />
        </div>

        {/* Floating label: always mounted, visibility toggled with opacity
            instead of conditional rendering, so it never changes the outer
            wrapper's bounding box (which would also trigger repositioning). */}
        <div
          className={`absolute bottom-full mb-1.5 px-2 py-1 rounded bg-slate-950/95 border border-slate-800 text-white text-[9px] font-mono font-bold whitespace-nowrap shadow-xl pointer-events-none z-50 transition-opacity duration-150 ${
            isHovered || isSelected ? "opacity-100" : "opacity-0"
          }`}
        >
          {phc.name}
        </div>
      </div>
    </AdvancedMarker>
  );
};

// Interactive custom spider leg component
const SpiderLeg: React.FC<{ from: google.maps.LatLngLiteral; to: google.maps.LatLngLiteral }> = ({ from, to }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const line = new google.maps.Polyline({
      path: [from, to],
      strokeColor: "#6366f1", // Indigo 500 mapping
      strokeOpacity: 0.4,
      strokeWeight: 1.2,
      map: map,
    });
    return () => {
      line.setMap(null);
    };
  }, [map, from.lat, from.lng, to.lat, to.lng]);
  return null;
};

interface ProcessedItem {
  id: string;
  isCluster: boolean;
  position: { lat: number; lng: number };
  phcs?: any[];
  phc?: any;
  count: number;
  status: 'red' | 'amber' | 'green';
  isSpiderfied?: boolean;
  originalPosition?: { lat: number; lng: number };
}

// Futuristic custom cluster marker component
const ClusterMarker: React.FC<{
  cluster: ProcessedItem;
  onClick: (cluster: ProcessedItem) => void;
  zoom: number;
}> = ({
  cluster,
  onClick,
  zoom
}) => {
  const color = cluster.status === "red"
    ? "#ef4444"
    : cluster.status === "amber"
      ? "#f59e0b"
      : "#10b981";

  const glowColor = cluster.status === "red"
    ? "rgba(239, 68, 68, 0.6)"
    : cluster.status === "amber"
      ? "rgba(245, 158, 11, 0.6)"
      : "rgba(16, 185, 129, 0.6)";

  const size = zoom < 6 ? 24 : zoom < 9 ? 30 : 36;

  return (
    <AdvancedMarker
      position={cluster.position}
      onClick={() => onClick(cluster)}
      zIndex={200 + (cluster.status === "red" ? 10 : 0)}
      collisionBehavior="OPTIONAL_AND_HIDE_LOWER_PRIORITY"
    >
      {/* Fixed, untransformed outer box — this is what AdvancedMarker
          measures/anchors. Scale transform lives on the inner div below. */}
      <div
        className="relative flex items-center justify-center cursor-pointer"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <div
          className="flex items-center justify-center rounded-full bg-slate-950/95 border border-indigo-500/50 text-indigo-400 font-mono text-[10px] font-bold shadow-lg hover:scale-110 transition-transform duration-150 relative w-full h-full"
          style={{
            boxShadow: `0 0 15px ${glowColor}, inset 0 0 6px rgba(99, 102, 241, 0.3)`,
          }}
        >
          <span>{cluster.count}</span>
          {/* Subtle pulsing indicator ring of highest status */}
          <div
            className="absolute -inset-0.5 rounded-full border animate-pulse"
            style={{
              borderColor: color,
              opacity: 0.3,
            }}
          />
        </div>
      </div>
    </AdvancedMarker>
  );
};

interface MapOverlaysProps {
  activeState: string;
  setActiveState: (state: string) => void;
  mapViewTab: "india" | "district";
  setMapViewTab: (tab: "india" | "district") => void;
  phcs: any[];
  selectedPhcId: string | null;
  setSelectedPhcId: (id: string | null) => void;
  hoveredPhcId: string | null;
  setHoveredPhcId: (id: string | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  mapType: "roadmap" | "hybrid";
}

// Handles Google Map data layers, markers, clustering, sync, and tooltips
function MapOverlays({
  activeState,
  setActiveState,
  mapViewTab,
  setMapViewTab,
  phcs,
  selectedPhcId,
  setSelectedPhcId,
  hoveredPhcId,
  setHoveredPhcId,
  searchTerm,
  setSearchTerm,
  mapType
}: MapOverlaysProps) {
  const map = useMap();
  const statesLayerRef = useRef<google.maps.Data | null>(null);
  const districtsLayerRef = useRef<google.maps.Data | null>(null);

  const [markers, setMarkers] = useState<{ [key: string]: google.maps.marker.AdvancedMarkerElement }>({});
  const [hoveredGeoName, setHoveredGeoName] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<google.maps.LatLngLiteral | null>(null);

  // Debounced search term for smooth marker updates
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sync MapType ID
  useEffect(() => {
    if (map) {
      map.setMapTypeId(mapType);
    }
  }, [map, mapType]);

  // Set up Data Overlays
  useEffect(() => {
    if (!map) return;

    const statesLayer = new google.maps.Data();
    const districtsLayer = new google.maps.Data();

    statesLayerRef.current = statesLayer;
    districtsLayerRef.current = districtsLayer;

    statesLayer.setMap(map);
    districtsLayer.setMap(null); // Managed dynamically

    // Style baseline
    statesLayer.setStyle({
      fillColor: "#6366f1",
      fillOpacity: 0.03,
      strokeColor: "rgba(255, 255, 255, 0.25)",
      strokeWeight: 0.8,
    });

    districtsLayer.setStyle({
      fillColor: "#818cf8",
      fillOpacity: 0.02,
      strokeColor: "rgba(224, 231, 255, 0.2)",
      strokeWeight: 0.4,
    });

    // Hover Highlight + Tooltip handlers for States
    statesLayer.addListener("mouseover", (event: google.maps.Data.MouseEvent) => {
      const name = getStateName(event.feature);
      if (!name) return;
      setHoveredGeoName(name);
      if (event.latLng) {
        setTooltipPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      }
      statesLayer.overrideStyle(event.feature, {
        fillColor: "rgba(99, 102, 241, 0.12)",
        strokeColor: "rgba(255, 255, 255, 0.65)",
        strokeWeight: 1.2
      });
    });

    statesLayer.addListener("mousemove", (event: google.maps.Data.MouseEvent) => {
      if (event.latLng) {
        setTooltipPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      }
    });

    statesLayer.addListener("mouseout", (event: google.maps.Data.MouseEvent) => {
      setHoveredGeoName(null);
      setTooltipPosition(null);
      statesLayer.revertStyle(event.feature);
    });

    statesLayer.addListener("click", (event: google.maps.Data.MouseEvent) => {
      const name = getStateName(event.feature);
      if (name) {
        setActiveState(name);
        setMapViewTab("district");
        const bounds = getFeatureBounds(event.feature);
        map.fitBounds(bounds);
      }
    });

    // Hover Highlight + Tooltip handlers for Districts
    districtsLayer.addListener("mouseover", (event: google.maps.Data.MouseEvent) => {
      const name = getDistrictName(event.feature);
      const state = getDistrictStateName(event.feature);
      if (!name) return;
      setHoveredGeoName(`${name}, ${state}`);
      if (event.latLng) {
        setTooltipPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      }
      districtsLayer.overrideStyle(event.feature, {
        fillColor: "rgba(129, 140, 248, 0.15)",
        strokeColor: "rgba(224, 231, 255, 0.7)",
        strokeWeight: 0.8
      });
    });

    districtsLayer.addListener("mousemove", (event: google.maps.Data.MouseEvent) => {
      if (event.latLng) {
        setTooltipPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      }
    });

    districtsLayer.addListener("mouseout", (event: google.maps.Data.MouseEvent) => {
      setHoveredGeoName(null);
      setTooltipPosition(null);
      districtsLayer.revertStyle(event.feature);
    });

    // Async Fetch & Cache GeoJSON Boundaries
    fetchGeoJson("https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson")
      .then((data) => {
        if (statesLayerRef.current === statesLayer) {
          statesLayer.addGeoJson(data);
        }
      })
      .catch((err) => console.warn("Failed to load India states GeoJSON:", err));

    fetchGeoJson("https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts-GeoJSON/master/india_districts.geojson")
      .then((data) => {
        if (districtsLayerRef.current === districtsLayer) {
          districtsLayer.addGeoJson(data);
        }
      })
      .catch((err) => console.warn("Failed to load India districts GeoJSON:", err));

    return () => {
      statesLayer.setMap(null);
      districtsLayer.setMap(null);
    };
  }, [map]);

  // Synchronize dynamic visibility of boundary layers based on tab & active state
  useEffect(() => {
    const statesLayer = statesLayerRef.current;
    const districtsLayer = districtsLayerRef.current;
    if (!statesLayer || !districtsLayer || !map) return;

    if (mapViewTab === "india" || !activeState) {
      statesLayer.setMap(map);
      districtsLayer.setMap(null);

      statesLayer.setStyle({
        fillColor: "#6366f1",
        fillOpacity: 0.03,
        strokeColor: "rgba(255, 255, 255, 0.25)",
        strokeWeight: 0.8,
        visible: true,
      });
    } else {
      statesLayer.setMap(map);
      districtsLayer.setMap(map);

      statesLayer.setStyle((feature) => {
        const isSelected = getStateName(feature).toUpperCase() === activeState.toUpperCase();
        return {
          fillColor: isSelected ? "rgba(99, 102, 241, 0.04)" : "transparent",
          fillOpacity: isSelected ? 0.2 : 0,
          strokeColor: isSelected ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.05)",
          strokeWeight: isSelected ? 1.5 : 0.4,
          visible: true,
        };
      });

      districtsLayer.setStyle((feature) => {
        const stateOfDistrict = getDistrictStateName(feature);
        const belongs = stateOfDistrict.toUpperCase() === activeState.toUpperCase();
        return {
          fillColor: belongs ? "rgba(99, 102, 241, 0.02)" : "transparent",
          fillOpacity: belongs ? 0.1 : 0,
          strokeColor: belongs ? "rgba(224, 231, 255, 0.3)" : "transparent",
          strokeWeight: belongs ? 0.6 : 0,
          visible: belongs,
        };
      });
    }
  }, [map, activeState, mapViewTab]);

  // Automatically zoom and pan to activeState bounds on state dropdown changes
  useEffect(() => {
    if (!map) return;

    if (mapViewTab === "india" || !activeState) {
      map.setCenter({ lat: 21.0, lng: 78.0 });
      map.setZoom(4.4);
      return;
    }

    const statesLayer = statesLayerRef.current;
    if (!statesLayer) return;

    let foundFeature: google.maps.Data.Feature | null = null;
    statesLayer.forEach((feature) => {
      if (getStateName(feature).toUpperCase() === activeState.toUpperCase()) {
        foundFeature = feature;
      }
    });

    if (foundFeature) {
      const bounds = getFeatureBounds(foundFeature);
      map.fitBounds(bounds);
    } else {
      // Fallback coordinate mapping
      const backupCoord = STATE_CENTERS[activeState.toUpperCase()];
      if (backupCoord) {
        map.setCenter(backupCoord);
        map.setZoom(6.5);
      }
    }
  }, [map, activeState, mapViewTab]);

  const [zoom, setZoom] = useState<number>(4.4);

  useEffect(() => {
    if (!map) return;
    setZoom(map.getZoom() || 4.4);
    const listener = map.addListener("zoom_changed", () => {
      setZoom(map.getZoom() || 4.4);
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);

  // Filter PHC list dynamically for markers
  const mapPhcs = useMemo(() => {
    return phcs.filter((p) => {
      if (mapViewTab === "district" && activeState) {
        if (!p.state || p.state.toUpperCase() !== activeState.toUpperCase()) {
          return false;
        }
      }
      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          (p.location && p.location.toLowerCase().includes(term)) ||
          (p.state && p.state.toLowerCase().includes(term)) ||
          (p.district && p.district.toLowerCase().includes(term)) ||
          p.riskAnalysis.status.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [phcs, activeState, mapViewTab, debouncedSearchTerm]);

  // Compute dynamic clusters & spiderfying layout in a single pass
  const processedItems = useMemo<ProcessedItem[]>(() => {
    if (mapPhcs.length === 0) return [];

    // Adaptive threshold radius (in degrees) based on map zoom scale
    const getThreshold = (z: number) => {
      if (z < 5) return 1.5;
      if (z < 7) return 0.7;
      if (z < 9) return 0.25;
      if (z < 11) return 0.08;
      if (z < 13) return 0.02;
      return 0.001; // extremely narrow clustering for identical overlaps
    };

    const threshold = getThreshold(zoom);
    const clusters: Array<{
      center: { lat: number; lng: number };
      phcs: any[];
    }> = [];

    // Aggregate into geographical proximity grids
    for (const phc of mapPhcs) {
      let found = false;
      for (const cluster of clusters) {
        const latDiff = phc.latitude - cluster.center.lat;
        const lngDiff = phc.longitude - cluster.center.lng;
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        if (distance < threshold) {
          cluster.phcs.push(phc);
          const count = cluster.phcs.length;
          // Calculate running average for cluster center
          cluster.center.lat = (cluster.center.lat * (count - 1) + phc.latitude) / count;
          cluster.center.lng = (cluster.center.lng * (count - 1) + phc.longitude) / count;
          found = true;
          break;
        }
      }
      if (!found) {
        clusters.push({
          center: { lat: phc.latitude, lng: phc.longitude },
          phcs: [phc],
        });
      }
    }

    const items: ProcessedItem[] = [];

    // Classify clusters and calculate radial spiderfy expansion where needed
    for (let cIdx = 0; cIdx < clusters.length; cIdx++) {
      const cluster = clusters[cIdx];
      const count = cluster.phcs.length;

      if (count === 1) {
        const phc = cluster.phcs[0];
        items.push({
          id: phc.id,
          isCluster: false,
          position: { lat: phc.latitude, lng: phc.longitude },
          phc,
          count: 1,
          status: phc.riskAnalysis.status,
        });
      } else {
        // Evaluate highest active status flag
        let status: 'red' | 'amber' | 'green' = 'green';
        for (const p of cluster.phcs) {
          if (p.riskAnalysis.status === 'red') {
            status = 'red';
            break;
          } else if (p.riskAnalysis.status === 'amber') {
            status = 'amber';
          }
        }

        // Check if coords are practically overlapping (less than ~150m)
        const isIdenticalLocation = cluster.phcs.every(p => {
          const dLat = Math.abs(p.latitude - cluster.center.lat);
          const dLng = Math.abs(p.longitude - cluster.center.lng);
          return dLat < 0.0015 && dLng < 0.0015;
        });

        const shouldSpiderfy = zoom >= 12 || (zoom >= 10 && isIdenticalLocation) || isIdenticalLocation;

        if (shouldSpiderfy) {
          const N = count;
          // Screen-space scaling offset factor: translates to roughly 35-45 pixels regardless of zoom
          const radiusDegrees = 56 / Math.pow(2, zoom);

          cluster.phcs.forEach((phc, idx) => {
            const theta = (2 * Math.PI * idx) / N;
            const latOffset = radiusDegrees * Math.cos(theta);
            const latRad = (cluster.center.lat * Math.PI) / 180;
            const lngOffset = (radiusDegrees * Math.sin(theta)) / Math.max(0.1, Math.cos(latRad));

            items.push({
              id: phc.id,
              isCluster: false,
              position: { lat: cluster.center.lat + latOffset, lng: cluster.center.lng + lngOffset },
              originalPosition: { lat: phc.latitude, lng: phc.longitude },
              phc,
              count: 1,
              status: phc.riskAnalysis.status,
              isSpiderfied: true,
            });
          });
        } else {
          items.push({
            id: `cluster-${cIdx}-${zoom}`,
            isCluster: true,
            position: cluster.center,
            phcs: cluster.phcs,
            count,
            status,
          });
        }
      }
    }

    return items;
  }, [mapPhcs, zoom]);

  const setMarkerRef = useCallback((marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => {
    setMarkers((prev) => {
      if (marker === prev[key]) return prev;
      if (marker) {
        return { ...prev, [key]: marker };
      } else {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
    });
  }, []);

  const handleClusterClick = useCallback((cluster: ProcessedItem) => {
    if (!map || !cluster.phcs) return;
    const bounds = new google.maps.LatLngBounds();
    cluster.phcs.forEach((p) => {
      bounds.extend({ lat: p.latitude, lng: p.longitude });
    });
    map.fitBounds(bounds);
    
    // Zoom in a bit further if bounds are tight
    if (map.getZoom() === zoom) {
      map.setZoom(zoom + 2);
    }
  }, [map, zoom]);

  const selectedPhc = useMemo(() => {
    return phcs.find((p) => p.id === selectedPhcId) || null;
  }, [phcs, selectedPhcId]);

  return (
    <>
      {/* Spider connections drawn under markers */}
      {processedItems.map((item) => {
        if (!item.isCluster && item.isSpiderfied && item.originalPosition) {
          return (
            <SpiderLeg
              key={`leg-${item.id}`}
              from={item.originalPosition}
              to={item.position}
            />
          );
        }
        return null;
      })}

      {/* Primary and clustered markers */}
      {processedItems.map((item) => {
        if (item.isCluster) {
          return (
            <ClusterMarker
              key={item.id}
              cluster={item}
              onClick={handleClusterClick}
              zoom={zoom}
            />
          );
        }

        const phc = item.phc;
        const isSelected = phc.id === selectedPhcId;
        const isHovered = phc.id === hoveredPhcId;
        const size = getMarkerSize(zoom);
        const zIndex = getZIndex(phc, isSelected, isHovered);

        return (
          <PhcMarker
            key={phc.id}
            phc={phc}
            position={item.position}
            size={size}
            zIndex={zIndex}
            setMarkerRef={setMarkerRef}
            onClick={(p) => setSelectedPhcId(p.id)}
            isSelected={isSelected}
            isHovered={isHovered}
            onMouseEnter={setHoveredPhcId}
            onMouseLeave={() => setHoveredPhcId(null)}
          />
        );
      })}

      {/* States & Districts Hover Tooltip */}
      {hoveredGeoName && tooltipPosition && (
        <InfoWindow
          position={tooltipPosition}
          disableAutoPan={true}
          headerDisabled={true}
        >
          <div className="px-1.5 py-0.5 font-mono text-[9.5px] text-slate-800 font-extrabold uppercase flex items-center gap-1">
            <span>📍</span> {hoveredGeoName}
          </div>
        </InfoWindow>
      )}

      {/* Selected PHC Clinical Summary Card */}
      {selectedPhc && markers[selectedPhc.id] && (
        <InfoWindow
          anchor={markers[selectedPhc.id]}
          onCloseClick={() => setSelectedPhcId(null)}
        >
          <div className="p-1 font-sans text-slate-900 max-w-[190px]">
            <h3 className="font-extrabold text-xs text-indigo-950 border-b border-indigo-100 pb-1 mb-1">{selectedPhc.name}</h3>
            <p className="text-[9.5px] text-slate-500 font-medium">District: {selectedPhc.district || "Unknown"}</p>
            <p className="text-[9.5px] text-slate-500 font-medium mb-1.5">State: {selectedPhc.state || "Unknown"}</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-mono bg-slate-50 p-1.5 rounded border border-slate-100">
              <div>Risk: <span className={`font-bold uppercase ${selectedPhc.riskAnalysis.status === 'red' ? 'text-red-500' : selectedPhc.riskAnalysis.status === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`}>{selectedPhc.riskAnalysis.status}</span></div>
              <div>Beds: <span className="text-slate-700 font-bold">{selectedPhc.bedsAvailable}</span></div>
              <div className="col-span-2">Kits: <span className="text-slate-700 font-bold">{selectedPhc.testKitsAvailable}</span></div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function EpidemiologicalGoogleMap({
  phcs,
  filteredPhcs,
  selectedPhcId,
  setSelectedPhcId,
  hoveredPhcId,
  setHoveredPhcId,
  activeState,
  setActiveState,
  mapViewTab,
  setMapViewTab,
  searchTerm,
  setSearchTerm
}: {
  phcs: any[];
  filteredPhcs: any[];
  selectedPhcId: string | null;
  setSelectedPhcId: (id: string | null) => void;
  hoveredPhcId: string | null;
  setHoveredPhcId: (id: string | null) => void;
  activeState: string;
  setActiveState: (state: string) => void;
  mapViewTab: "india" | "district";
  setMapViewTab: (tab: "india" | "district") => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) {
  const [mapType, setMapType] = useState<"roadmap" | "hybrid">("roadmap");

  const selectedPhc = useMemo(() => {
    return phcs.find(p => p.id === selectedPhcId) || null;
  }, [phcs, selectedPhcId]);

  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] p-6 text-center font-sans bg-slate-950 border border-slate-900 rounded-xl relative group">
        <div className="max-w-[480px] bg-slate-900/40 p-6 border border-slate-800 rounded-xl backdrop-blur-md shadow-2xl relative z-10">
          <Globe className="h-10 w-10 text-indigo-400 mx-auto mb-3 animate-pulse" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Google Maps SDK Key Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Interactive map boundaries, district overlays, and status marker clusterers require a Google Maps Platform API key.
          </p>
          
          <div className="text-left bg-slate-950/80 border border-slate-900 rounded p-4 text-[10px] font-mono leading-relaxed text-slate-300">
            <p className="font-bold text-indigo-400 mb-2">Setup Procedure:</p>
            <p className="mb-1.5"><strong>1.</strong> Get your key: <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300">GCP Console</a></p>
            <p className="mb-1.5"><strong>2.</strong> Open **Settings** (⚙️ top-right gear icon) → **Secrets**</p>
            <p className="mb-1.5"><strong>3.</strong> Name: <code className="bg-slate-900 px-1 py-0.5 rounded text-white font-bold">GOOGLE_MAPS_PLATFORM_KEY</code></p>
            <p><strong>4.</strong> Paste value and click **Add Secret**. The app will rebuild dynamically.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] bg-slate-950 overflow-hidden group">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={{ lat: 21.0, lng: 78.0 }}
          defaultZoom={4.4}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI={true}
          gestureHandling="greedy"
        >
          <MapOverlays
            activeState={activeState}
            setActiveState={setActiveState}
            mapViewTab={mapViewTab}
            setMapViewTab={setMapViewTab}
            phcs={phcs}
            selectedPhcId={selectedPhcId}
            setSelectedPhcId={setSelectedPhcId}
            hoveredPhcId={hoveredPhcId}
            setHoveredPhcId={setHoveredPhcId}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            mapType={mapType}
          />
        </Map>
      </APIProvider>

      {/* Dynamic Drilldown Breadcrumbs (Top-Left) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-slate-950/90 border border-slate-900 rounded-lg py-1.5 px-3 backdrop-blur-md shadow-lg text-[9.5px] font-mono">
        <button
          onClick={() => {
            setMapViewTab("india");
            setActiveState("Uttar Pradesh");
            setSelectedPhcId(null);
          }}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer font-bold uppercase tracking-wider"
        >
          INDIA
        </button>
        {activeState && mapViewTab === "district" && (
          <>
            <span className="text-slate-700">/</span>
            <span className="text-indigo-400 font-bold uppercase tracking-wider">
              {activeState}
            </span>
          </>
        )}
        {selectedPhc && (
          <>
            <span className="text-slate-700">/</span>
            <span className="text-slate-200 truncate max-w-[100px] uppercase font-extrabold tracking-wider">
              {selectedPhc.name.replace(" PHC", "").replace(" CHC", "")}
            </span>
          </>
        )}
      </div>

      {/* Search Input Filter Overlay (Top-Right-Offset) */}
      <div className="absolute top-3 right-32 z-10 flex items-center gap-2 bg-slate-950/90 border border-slate-900 rounded-lg py-1 px-2.5 backdrop-blur-md max-w-[150px] shadow-lg">
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Filter map..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-[9.5px] text-white focus:outline-none w-full font-mono placeholder:text-slate-600"
        />
      </div>

      {/* Custom Layer Terrain Switcher Toggle (Top-Right) */}
      <button
        onClick={() => setMapType((t) => (t === "roadmap" ? "hybrid" : "roadmap"))}
        className="absolute top-3 right-3 z-10 bg-slate-950/90 hover:bg-slate-900 border border-slate-900 rounded px-2.5 py-1.5 text-[9px] font-mono font-bold text-indigo-400 flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer hover:border-indigo-500/30"
      >
        <Layers className="h-3 w-3 text-indigo-400" />
        <span>{mapType === "roadmap" ? "BLUEPRINT" : "SATELLITE"}</span>
      </button>

      {/* Custom Legend Overlay (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 bg-slate-950/90 border border-slate-900 rounded-lg p-2.5 backdrop-blur-md shadow-xl text-[8.5px] font-mono text-slate-300">
        <div className="font-bold text-slate-500 uppercase tracking-wider mb-0.5 border-b border-slate-900 pb-1">Facility Status</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
          <span>Critical Stockout</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
          <span>Watch (Low Stocks)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          <span>Stable Inventory</span>
        </div>
      </div>

      {/* Custom Scale bar & Attribution (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 pointer-events-none text-[8px] font-mono text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded">
        <div className="flex items-center gap-1">
          <div className="w-8 h-[2px] bg-slate-500 relative">
            <div className="absolute left-0 top-[-2px] h-[6px] w-[2px] bg-slate-500"></div>
            <div className="absolute right-0 top-[-2px] h-[6px] w-[2px] bg-slate-500"></div>
          </div>
          <span>500 km</span>
        </div>
        <span>© Google Maps</span>
      </div>
    </div>
  );
}