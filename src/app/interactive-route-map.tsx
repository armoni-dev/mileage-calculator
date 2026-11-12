"use client";

import { useEffect, useRef, useState } from "react";

export type RouteCandidate = {
  id: string;
  description: string;
  distanceKm: number;
  duration: string | null;
  tollFeeYen: number | null;
  encodedPolyline: string;
};

export type MapPoint = { lat: number; lng: number };
export type MapTarget = "origin" | "destination" | `via-${number}`;
type GoogleMap = {
  fitBounds(bounds: GoogleLatLngBounds): void;
  addListener(eventName: "click", listener: (event: GoogleMapMouseEvent) => void): { remove(): void };
  panTo(latLng: MapPoint): void;
  setZoom(zoom: number): void;
};
type GoogleMapMouseEvent = { latLng?: { lat(): number; lng(): number } };
type GooglePolyline = {
  setMap(map: GoogleMap | null): void;
  addListener(eventName: "click", listener: () => void): { remove(): void };
};
type GoogleLatLngBounds = {
  extend(point: MapPoint): void;
};
type GoogleMarker = {
  setMap(map: GoogleMap | null): void;
  setPosition(position: MapPoint): void;
  setTitle(title: string): void;
};
type GooglePlacePrediction = {
  placeId?: string;
  text: { text: string };
  mainText?: { text: string };
  secondaryText?: { text: string };
};
type GooglePlacesApi = {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(request: {
      input: string;
      includedRegionCodes?: string[];
      language?: string;
    }): Promise<{
      suggestions: Array<{ placePrediction?: GooglePlacePrediction }>;
    }>;
  };
};
export type PlaceAutocompletePrediction = {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type GoogleMapsApi = {
  importLibrary(name: "places"): Promise<GooglePlacesApi>;
  Map: new (
    element: HTMLElement,
    options: {
      center: MapPoint;
      zoom: number;
      mapTypeControl: boolean;
      streetViewControl: boolean;
      fullscreenControl: boolean;
      zoomControl: boolean;
    },
  ) => GoogleMap;
  Polyline: new (options: {
    map: GoogleMap;
    path: MapPoint[];
    strokeColor: string;
    strokeOpacity: number;
    strokeWeight: number;
    zIndex: number;
  }) => GooglePolyline;
  Marker: new (options: { map: GoogleMap; position: MapPoint; title: string   }) => GoogleMarker;
  LatLngBounds: new () => GoogleLatLngBounds;
};

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
    initGoogleMapsForRouteCalculator?: () => void;
  }
}

let googleMapsLoader: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.Map && window.google?.maps?.Polyline) return Promise.resolve();
  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const callbackName = "initGoogleMapsForRouteCalculator";
    const timeoutId = window.setTimeout(() => {
      delete window[callbackName];
      reject(new Error("Google Maps JavaScript API loading timed out"));
    }, 20000);

    window[callbackName] = () => {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      resolve();
    };
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      reject(new Error("Google Maps JavaScript API failed to load"));
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&language=ja&region=JP`;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    googleMapsLoader = null;
    throw error;
  });

  return googleMapsLoader;
}

export async function fetchPlacePredictions(
  apiKey: string,
  input: string,
): Promise<PlaceAutocompletePrediction[]> {
  await loadGoogleMaps(apiKey);
  const maps = window.google?.maps;
  if (!maps) throw new Error("Google Maps JavaScript API is unavailable");

  const places = await maps.importLibrary("places");
  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    includedRegionCodes: ["jp"],
    language: "ja",
  });

  return suggestions.flatMap(({ placePrediction }) => {
    if (!placePrediction?.text.text) return [];

    const description = placePrediction.text.text;
    return [{
      id: placePrediction.placeId ?? description,
      description,
      mainText: placePrediction.mainText?.text ?? description,
      secondaryText: placePrediction.secondaryText?.text ?? "",
    }];
  });
}

function decodePolyline(encoded: string): MapPoint[] {
  const points: MapPoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) throw new Error("Invalid route polyline");
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63 || shift > 30) throw new Error("Invalid route polyline");
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      if (index >= encoded.length) throw new Error("Invalid route polyline");
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63 || shift > 30) throw new Error("Invalid route polyline");
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    points.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }

  return points;
}

export default function InteractiveRouteMap({
  routes,
  selectedRouteId,
  onSelectRoute,
  mapTarget,
  onPickLocation,
  locations,
  apiKey,
}: {
  routes: RouteCandidate[];
  selectedRouteId: string | null;
  onSelectRoute: (route: RouteCandidate) => void;
  mapTarget: MapTarget | null;
  onPickLocation: (target: MapTarget, point: MapPoint) => void;
  locations: Array<{ target: MapTarget; point: MapPoint; title: string }>;
  apiKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const routesRef = useRef(routes);
  const fittedRoutesRef = useRef<RouteCandidate[] | null>(null);
  const onSelectRouteRef = useRef(onSelectRoute);
  const onPickLocationRef = useRef(onPickLocation);
  const mapTargetRef = useRef(mapTarget);
  const [map, setMap] = useState<GoogleMap | null>(null);
  const [loadError, setLoadError] = useState("");
  const [currentLocation, setCurrentLocation] = useState<MapPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handlePanToCurrentLocation = () => {
    const maps = window.google?.maps;
    if (!map || !maps) return;
    if (!navigator.geolocation) {
      setLoadError("このブラウザーでは現在地を取得できません。");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(point);
        map.panTo(point);
        map.setZoom(15);
      },
      (error) => {
        setIsLocating(false);
        console.warn("Failed to get current location", error);
        setLoadError("現在地を取得できませんでした。位置情報の許可をご確認ください。");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    routesRef.current = routes;
    onSelectRouteRef.current = onSelectRoute;
    onPickLocationRef.current = onPickLocation;
    mapTargetRef.current = mapTarget;
  }, [routes, onSelectRoute, onPickLocation, mapTarget]);

  useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;

    const getInitialCenter = (): Promise<{ center: MapPoint; zoom: number }> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ center: { lat: 35.6812, lng: 139.7671 }, zoom: 6 });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              center: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
              zoom: 14,
            });
          },
          (error) => {
            console.warn("Geolocation failed or denied, falling back to default.", error);
            resolve({ center: { lat: 35.6812, lng: 139.7671 }, zoom: 6 });
          },
          {
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      });
    };

    loadGoogleMaps(apiKey)
      .then(async () => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;
        const { center, zoom } = await getInitialCenter();
        if (cancelled || !containerRef.current || !window.google?.maps) return;

        setMap(new window.google.maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        }));
      })
      .catch((error: unknown) => {
        console.error("Failed to load Google Maps", error);
        if (!cancelled) setLoadError("Googleマップを読み込めませんでした。API設定をご確認ください。");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!map || !maps) return;

    let active = true;
    const bounds = new maps.LatLngBounds();
    const polylines: GooglePolyline[] = [];
    const markers: GoogleMarker[] = [];
    const listeners: Array<{ remove(): void }> = [];
    let hasPoints = false;

    try {
      listeners.push(map.addListener("click", (event) => {
        const point = event.latLng;
        const target = mapTargetRef.current;
        if (point && target) {
          onPickLocationRef.current(target, { lat: point.lat(), lng: point.lng() });
        }
      }));

      locations.forEach(({ point, title }) => {
        markers.push(new maps.Marker({ map, position: point, title }));
      });

      if (currentLocation) {
        markers.push(new maps.Marker({
          map,
          position: currentLocation,
          title: "現在地",
        }));
      }

      routes.forEach((route) => {
        const path = decodePolyline(route.encodedPolyline);
        if (path.length === 0) return;
        path.forEach((point) => bounds.extend(point));
        hasPoints = true;

        const selected = route.id === selectedRouteId;
        const polyline = new maps.Polyline({
          map,
          path,
          strokeColor: selected ? "#2563eb" : "#6b7280",
          strokeOpacity: selected ? 1 : 0.75,
          strokeWeight: selected ? 8 : 5,
          zIndex: selected ? 2 : 1,
        });
        polylines.push(polyline);
        listeners.push(polyline.addListener("click", () => {
          const currentRoute = routesRef.current.find(({ id }) => id === route.id);
          if (currentRoute) onSelectRouteRef.current(currentRoute);
        }));
      });
    } catch (error) {
      console.error("Failed to draw Google Maps route", error);
      window.queueMicrotask(() => {
        if (active) setLoadError("ルートを地図上に表示できませんでした。再度検索してください。");
      });
    }

    if (hasPoints && fittedRoutesRef.current !== routes) {
      map.fitBounds(bounds);
      fittedRoutesRef.current = routes;
    }

    return () => {
      active = false;
      listeners.forEach((listener) => listener.remove());
      polylines.forEach((polyline) => polyline.setMap(null));
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [map, routes, selectedRouteId, locations, currentLocation]);

  const displayError = apiKey
    ? loadError
    : "地図を表示するにはNEXT_PUBLIC_GOOGLE_MAPS_API_KEYの設定が必要です。";

  return (
    <div className="relative">
      <div
        ref={containerRef}
        role="region"
        aria-label="ルート候補の地図"
        className="h-80 w-full overflow-hidden rounded-md border border-gray-300 dark:border-gray-600"
      />
      <div className="absolute bottom-7 left-2 z-10">
        <button
          type="button"
          onClick={handlePanToCurrentLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50 border border-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50"
          title="現在地を表示"
        >
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isLocating ? "取得中..." : "現在地"}
        </button>
      </div>
      {displayError && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {displayError}
        </p>
      )}
    </div>
  );
}
