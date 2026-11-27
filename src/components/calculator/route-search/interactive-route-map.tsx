"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  reverseGeocodePoint,
  type GoogleMap,
  type GoogleMarker,
  type GooglePolyline,
} from "./google-maps-api";
import type { MapPoint, RouteCandidate } from "./google-maps-api";

export function MapLocationPicker({
  apiKey,
  initialPoint,
  title,
  onSelect,
  onClose,
}: {
  apiKey: string;
  initialPoint: MapPoint | null;
  title: string;
  onSelect: (address: string, point: MapPoint) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const initialPointRef = useRef(initialPoint);
  const [map, setMap] = useState<GoogleMap | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      setLoadError("地図を表示するにはGoogle Maps APIキーの設定が必要です。");
      return;
    }

    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;
        const defaultCenter = { lat: 35.6812, lng: 139.7671 };
        const defaultZoom = 6;
        const point = initialPointRef.current ?? defaultCenter;
        const zoom = initialPointRef.current ? 15 : defaultZoom;

        const mapInstance = new window.google.maps.Map(containerRef.current, {
          center: point,
          zoom,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          },
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });
        setMap(mapInstance);

        if (!initialPointRef.current && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (cancelled) return;
              const userPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              mapInstance.setCenter(userPos);
              mapInstance.setZoom(14);
            },
            (error) => {
              console.warn("Geolocation failed or denied, keeping default center:", error);
            },
            {
              timeout: 10000,
              maximumAge: 60000,
            },
          );
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load Google Maps location picker", error);
        if (!cancelled) setLoadError("Googleマップを読み込めませんでした。API設定をご確認ください。");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (!map || !initialPoint) return;
    map.panTo(initialPoint);
    map.setZoom(15);
  }, [initialPoint, map]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!map || !maps) return;

    if (initialPoint) {
      markerRef.current = new maps.Marker({
        map,
        position: initialPoint,
        title: "選択中の位置",
        clickable: false,
      });
    }

    const listener = map.addListener("click", async ({ latLng }) => {
      if (!latLng || isResolving) return;
      const point = { lat: latLng.lat(), lng: latLng.lng() };
      setSelectionError("");
      markerRef.current?.setMap(null);
      markerRef.current = new maps.Marker({
        map,
        position: point,
        title: "選択した位置",
        clickable: false,
      });

      setIsResolving(true);
      try {
        const address = await reverseGeocodePoint(apiKey, point);
        onSelect(address, point);
      } catch (error) {
        console.error("Failed to resolve selected map location", error);
        setSelectionError("住所を取得できませんでした。別の位置を選択してください。");
      } finally {
        setIsResolving(false);
      }
    });

    return () => {
      listener.remove();
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [map, initialPoint, apiKey, isResolving, onSelect]);

  return (
    <section
      ref={wrapperRef}
      className="mt-1 rounded-lg bg-white p-3 shadow-sm dark:bg-zinc-900"
      aria-label={title}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"
        >
          閉じる
        </button>
      </div>
      <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        {isResolving ? "住所を取得中..." : "地図をタップして位置を指定してください。"}
      </p>
      <div
        ref={containerRef}
        role="region"
        aria-label="位置選択用の地図"
        className="h-72 w-full rounded-md sm:h-80"
      />
      {(loadError || selectionError) && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {loadError || selectionError}
        </p>
      )}
    </section>
  );
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
  locations,
  focusPoint,
  apiKey,
}: {
  routes: RouteCandidate[];
  selectedRouteId: string | null;
  onSelectRoute: (route: RouteCandidate) => void;
  locations: Array<{ point: MapPoint; title: string }>;
  focusPoint: MapPoint | null;
  apiKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const routesRef = useRef(routes);
  const onSelectRouteRef = useRef(onSelectRoute);
  const [map, setMap] = useState<GoogleMap | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    routesRef.current = routes;
    onSelectRouteRef.current = onSelectRoute;
  }, [routes, onSelectRoute]);

  useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;

        const initialCenter = { lat: 35.6812, lng: 139.7671 };
        const initialZoom = 6;

        const mapInstance = new window.google.maps.Map(containerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          },
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });
        setMap(mapInstance);

        if (routesRef.current.length === 0 && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (cancelled) return;
              const userPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              mapInstance.setCenter(userPos);
              mapInstance.setZoom(14);
            },
            (error) => {
              console.warn("Geolocation failed or denied, keeping default center:", error);
            },
            {
              timeout: 10000,
              maximumAge: 60000,
            },
          );
        }
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
      locations.forEach(({ point, title }) => {
        markers.push(new maps.Marker({
          map,
          position: point,
          title,
        }));
        bounds.extend(point);
        hasPoints = true;
      });

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

    if (hasPoints) {
      map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });
    }

    return () => {
      active = false;
      listeners.forEach((listener) => listener.remove());
      polylines.forEach((polyline) => polyline.setMap(null));
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [map, routes, selectedRouteId, locations]);

  useEffect(() => {
    if (!map || !focusPoint || routes.length > 0) return;
    map.panTo(focusPoint);
    map.setZoom(15);
  }, [map, focusPoint, routes]);

  const displayError = apiKey
    ? loadError
    : "地図を表示するにはNEXT_PUBLIC_GOOGLE_MAPS_API_KEYの設定が必要です。";

  return (
    <div className="relative">
      <div
        ref={containerRef}
        role="region"
        aria-label="ルート候補の地図"
        className="h-80 w-full overflow-hidden rounded-md"
      />
      {displayError && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {displayError}
        </p>
      )}
    </div>
  );
}
