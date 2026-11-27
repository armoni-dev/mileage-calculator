export type RouteCandidate = {
  id: string;
  description: string;
  distanceKm: number;
  duration: string | null;
  tollFeeYen: number | null;
  encodedPolyline: string;
};

export type MapPoint = { lat: number; lng: number };

export type PlaceAutocompletePrediction = {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type GoogleMap = {
  fitBounds(
    bounds: GoogleLatLngBounds,
    padding?:
      | number
      | { top?: number; right?: number; bottom?: number; left?: number },
  ): void;
  panTo(latLng: MapPoint): void;
  setCenter(latLng: MapPoint): void;
  setZoom(zoom: number): void;
  getZoom(): number | undefined;
  addListener(
    eventName: "click",
    listener: (event: { latLng: { lat(): number; lng(): number } | null }) => void,
  ): { remove(): void };
};

export type GooglePolyline = {
  setMap(map: GoogleMap | null): void;
  addListener(eventName: "click", listener: () => void): { remove(): void };
};

type GoogleLatLngBounds = {
  extend(point: MapPoint): void;
};

export type GoogleMarker = {
  setMap(map: GoogleMap | null): void;
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

type GoogleGeocoderResult = {
  geometry: {
    location: {
      lat(): number;
      lng(): number;
    };
  };
  formatted_address: string;
};

type GoogleGeocoder = {
  geocode(
    request: { address: string } | { location: MapPoint },
    callback: (results: GoogleGeocoderResult[] | null, status: string) => void,
  ): void;
};

type GoogleMapsApi = {
  importLibrary(name: "places"): Promise<GooglePlacesApi>;
  importLibrary(name: "geocoding"): Promise<GoogleGeocoderApi>;
  event?: {
    addListenerOnce(
      instance: unknown,
      eventName: string,
      handler: (...args: unknown[]) => void,
    ): { remove(): void };
  };
  MapTypeControlStyle: {
    DEFAULT: number;
    DROPDOWN_MENU: number;
    HORIZONTAL_BAR: number;
  };
  Map: new (
    element: HTMLElement,
    options: {
      center: MapPoint;
      zoom: number;
      mapTypeControl: boolean;
      mapTypeControlOptions?: {
        style?: number;
      };
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
    clickable?: boolean;
  }) => GooglePolyline;
  Marker: new (options: {
    map: GoogleMap;
    position: MapPoint;
    title: string;
    clickable?: boolean;
  }) => GoogleMarker;
  LatLngBounds: new () => GoogleLatLngBounds;
  Geocoder: new () => GoogleGeocoder;
};

type GoogleGeocoderApi = {
  Geocoder: new () => GoogleGeocoder;
};

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
    initGoogleMapsForRouteCalculator?: () => void;
  }
}

let googleMapsLoader: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.Map && window.google?.maps?.Polyline) {
    return Promise.resolve();
  }
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
  const { suggestions } =
    await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      includedRegionCodes: ["jp"],
      language: "ja",
    });

  return suggestions.flatMap(({ placePrediction }) => {
    if (!placePrediction?.text.text) return [];

    const description = placePrediction.text.text;
    return [
      {
        id: placePrediction.placeId ?? description,
        description,
        mainText: placePrediction.mainText?.text ?? description,
        secondaryText: placePrediction.secondaryText?.text ?? "",
      },
    ];
  });
}

export async function geocodeAddress(
  apiKey: string,
  address: string,
): Promise<MapPoint | null> {
  await loadGoogleMaps(apiKey);
  const maps = window.google?.maps;
  if (!maps) throw new Error("Google Maps JavaScript API is unavailable");

  return new Promise((resolve) => {
    const geocoder = new maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
}

export async function reverseGeocodePoint(
  apiKey: string,
  point: MapPoint,
): Promise<string> {
  await loadGoogleMaps(apiKey);
  const maps = window.google?.maps;
  if (!maps) throw new Error("Google Maps JavaScript API is unavailable");

  return new Promise((resolve, reject) => {
    const geocoder = new maps.Geocoder();
    geocoder.geocode({ location: point }, (results, status) => {
      const address = results?.[0]?.formatted_address;
      if (status === "OK" && address) {
        resolve(address);
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
}
