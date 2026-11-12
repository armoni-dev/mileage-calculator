import { NextResponse } from "next/server";

type GoogleMoney = {
  currencyCode?: string;
  units?: string;
  nanos?: number;
};

type GoogleRoute = {
  distanceMeters?: number;
  duration?: string;
  description?: string;
  polyline?: {
    encodedPolyline?: string;
  };
  travelAdvisory?: {
    tollInfo?: {
      estimatedPrice?: GoogleMoney[];
    };
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMoney(value: unknown): GoogleMoney | null {
  if (!isRecord(value)) return null;
  return {
    currencyCode: typeof value.currencyCode === "string" ? value.currencyCode : undefined,
    units: typeof value.units === "string" ? value.units : undefined,
    nanos: typeof value.nanos === "number" ? value.nanos : undefined,
  };
}

function parseRoute(value: unknown): GoogleRoute | null {
  if (!isRecord(value)) return null;

  const advisory = isRecord(value.travelAdvisory) ? value.travelAdvisory : undefined;
  const tollInfo = advisory && isRecord(advisory.tollInfo) ? advisory.tollInfo : undefined;
  const prices = tollInfo && Array.isArray(tollInfo.estimatedPrice)
    ? tollInfo.estimatedPrice.map(parseMoney).filter((price) => price !== null)
    : undefined;

  return {
    distanceMeters: typeof value.distanceMeters === "number" ? value.distanceMeters : undefined,
    duration: typeof value.duration === "string" ? value.duration : undefined,
    description: typeof value.description === "string" ? value.description : undefined,
    polyline: isRecord(value.polyline)
      ? {
          encodedPolyline: typeof value.polyline.encodedPolyline === "string"
            ? value.polyline.encodedPolyline
            : undefined,
        }
      : undefined,
    travelAdvisory: prices ? { tollInfo: { estimatedPrice: prices } } : undefined,
  };
}

function getEstimatedToll(route: GoogleRoute): number | null {
  const prices = route.travelAdvisory?.tollInfo?.estimatedPrice;
  if (!prices?.length || prices.some((price) => price.currencyCode !== "JPY")) return null;

  return prices.reduce((total, price) => {
    const units = Number(price.units ?? "0");
    const nanos = price.nanos ?? 0;
    return total + units + nanos / 1_000_000_000;
  }, 0);
}

function getPlace(value: string) {
  const coordinates = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coordinates) {
    const latitude = Number(coordinates[1]);
    const longitude = Number(coordinates[2]);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { location: { latLng: { latitude, longitude } } };
  }
  return { address: value };
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ルート検索を利用するにはGOOGLE_MAPS_API_KEYの設定が必要です。" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエスト形式が正しくありません。" }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.origin !== "string" || typeof body.destination !== "string") {
    return NextResponse.json({ error: "出発地と目的地を入力してください。" }, { status: 400 });
  }

  const origin = body.origin.trim();
  const destination = body.destination.trim();
  if (!origin || !destination || origin.length > 200 || destination.length > 200) {
    return NextResponse.json({ error: "出発地と目的地を1〜200文字で入力してください。" }, { status: 400 });
  }

  const originPlace = getPlace(origin);
  const destinationPlace = getPlace(destination);
  if (!originPlace || !destinationPlace) {
    return NextResponse.json({ error: "地図上で指定した位置が正しくありません。" }, { status: 400 });
  }

  const rawIntermediates = body.intermediates;
  let intermediateAddresses: string[] = [];
  if (rawIntermediates !== undefined) {
    if (
      !Array.isArray(rawIntermediates) ||
      rawIntermediates.length > 25 ||
      !rawIntermediates.every(
        (place): place is string =>
          typeof place === "string" && place.trim().length > 0 && place.length <= 200,
      )
    ) {
      return NextResponse.json({ error: "経由地は25か所以内で入力してください。" }, { status: 400 });
    }
    intermediateAddresses = rawIntermediates;
  }

  const intermediates = intermediateAddresses.map((place) => ({
    place: getPlace(place.trim()),
  }));
  if (intermediates?.some(({ place }) => place === null)) {
    return NextResponse.json({ error: "地図上で指定した経由地が正しくありません。" }, { status: 400 });
  }

  const avoidTolls = body.avoidTolls === true;
  const avoidHighways = body.avoidHighways === true;
  const tollPass = body.tollPass;
  if (tollPass !== undefined && tollPass !== "JP_ETC" && tollPass !== "JP_ETC2") {
    return NextResponse.json({ error: "ETC設定が正しくありません。" }, { status: 400 });
  }

  try {
    const modifierCombinations = [
      { avoidTolls, avoidHighways },
      { avoidTolls: !avoidTolls, avoidHighways },
      { avoidTolls, avoidHighways: !avoidHighways },
      { avoidTolls: true, avoidHighways: true },
      { avoidTolls: false, avoidHighways: false },
    ];

    // 重複を避けるためユニークな組み合わせにする
    const uniqueModifiers = modifierCombinations.filter(
      (mod, index, self) =>
        index === self.findIndex((m) => m.avoidTolls === mod.avoidTolls && m.avoidHighways === mod.avoidHighways)
    );

    const routePromises = uniqueModifiers.map(async (modifiers) => {
      try {
        const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.description,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo",
          },
          body: JSON.stringify({
            origin: originPlace,
            destination: destinationPlace,
            intermediates: intermediates?.map(({ place }) => ({ ...place!, via: true })),
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            computeAlternativeRoutes: !intermediates?.length,
            extraComputations: ["TOLLS"],
            routeModifiers: {
              avoidTolls: modifiers.avoidTolls,
              avoidHighways: modifiers.avoidHighways,
              ...(tollPass ? { tollPasses: [tollPass] } : {}),
            },
            languageCode: "ja-JP",
            regionCode: "JP",
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) return [];
        const result: unknown = await response.json();
        const rawRoutes = isRecord(result) && Array.isArray(result.routes) ? result.routes : [];
        return rawRoutes
          .map(parseRoute)
          .filter((route): route is GoogleRoute => route !== null)
          .filter((route) =>
            typeof route.distanceMeters === "number" &&
            route.distanceMeters > 0 &&
            typeof route.polyline?.encodedPolyline === "string",
          );
      } catch {
        return [];
      }
    });

    const results = await Promise.all(routePromises);
    const allRawRoutes = results.flat();

    // 距離やポリライン等でユニークなルートを抽出
    const seenPolylines = new Set<string>();
    const uniqueGoogleRoutes: GoogleRoute[] = [];
    for (const route of allRawRoutes) {
      const polyline = route.polyline?.encodedPolyline;
      if (polyline && !seenPolylines.has(polyline)) {
        seenPolylines.add(polyline);
        uniqueGoogleRoutes.push(route);
      }
    }

    const routes = uniqueGoogleRoutes.slice(0, 10).map((route, index) => ({
      id: String(index),
      description: route.description || `候補 ${index + 1}`,
      distanceKm: Math.round((route.distanceMeters! / 1000) * 10) / 10,
      duration: route.duration ?? null,
      tollFeeYen: getEstimatedToll(route),
      encodedPolyline: route.polyline!.encodedPolyline!,
    }));

    if (routes.length === 0) {
      return NextResponse.json(
        { error: "Googleマップのルート検索に失敗しました。API設定や利用状況をご確認ください。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ routes });
  } catch (error) {
    console.error("Google Routes API request failed", error);
    return NextResponse.json(
      { error: "ルート検索中にエラーが発生しました。時間をおいて再度お試しください。" },
      { status: 502 },
    );
  }
}
