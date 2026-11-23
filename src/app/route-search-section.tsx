"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Eraser, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import InteractiveRouteMap, {
    fetchPlacePredictions,
    geocodeAddress,
    MapLocationPicker,
    type MapPoint,
    type PlaceAutocompletePrediction,
    type RouteCandidate,
} from "./interactive-route-map";

// 全角数字・記号を半角に変換するヘルパー関数
function toHalfWidth(str: string): string {
    return str
        .replace(/[０-９]/g, (s) =>
            String.fromCharCode(s.charCodeAt(0) - 0xfee0),
        )
        .replace(/．/g, ".")
        .replace(/ー/g, "-");
}
type MapSelectionTarget =
    | { type: "origin" }
    | { type: "destination" }
    | { type: "intermediate"; index: number };

type PlaceAutocompleteInputProps = {
    value: string;
    onChange: (value: string) => void;
    onLocationResolved?: (point: MapPoint) => void;
    placeholder: string;
    clearLabel: string;
    emptyAction?: { label: string; onClick: () => void };
    className?: string;
    apiKey: string;
    onActivate: () => void;
};

function PlaceAutocompleteInput({
    value,
    onChange,
    onLocationResolved,
    placeholder,
    clearLabel,
    emptyAction,
    className,
    apiKey,
    onActivate,
}: PlaceAutocompleteInputProps) {
    const [predictions, setPredictions] = useState<
        PlaceAutocompletePrediction[]
    >([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const predictionRequestRef = useRef(0);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = async (newValue: string) => {
        onChange(newValue);
        const requestId = ++predictionRequestRef.current;
        if (!newValue.trim() || !apiKey) {
            setPredictions([]);
            setIsOpen(true);
            return;
        }

        try {
            const results = await fetchPlacePredictions(apiKey, newValue);
            if (requestId !== predictionRequestRef.current) return;
            setPredictions(results);
            setIsOpen(true);
        } catch (error) {
            if (requestId !== predictionRequestRef.current) return;
            console.error("Failed to fetch Google Places suggestions", error);
            setPredictions([]);
            setIsOpen(true);
        }
    };

    const resolveAndSetLocation = async (
        addressText: string,
        requestId: number,
    ) => {
        if (!addressText.trim() || !apiKey) return;

        try {
            const point = await geocodeAddress(apiKey, addressText);
            if (point && requestId === predictionRequestRef.current)
                onLocationResolved?.(point);
        } catch (error) {
            console.error("Failed to geocode selected place", error);
        }
    };

    const handleSelectPrediction = async (description: string) => {
        const requestId = ++predictionRequestRef.current;
        onChange(description);
        setIsOpen(false);
        setPredictions([]);
        await resolveAndSetLocation(description, requestId);
    };

    const handleAction = () => {
        predictionRequestRef.current += 1;
        setPredictions([]);
        setIsOpen(false);
        if (value !== "") {
            onChange("");
        } else {
            emptyAction?.onClick();
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(event) => handleInputChange(event.target.value)}
                    onBlur={() => setIsOpen(false)}
                    onKeyDown={(event) => {
                        if (
                            event.key === "Enter" &&
                            isOpen &&
                            !event.nativeEvent.isComposing
                        ) {
                            event.preventDefault();
                        }
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        onActivate();
                    }}
                    placeholder={placeholder}
                    className={`min-w-0 flex-1 bg-white ${className}`}
                />
                {(value !== "" || emptyAction) && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleAction}
                        className="h-10 w-10 bg-white text-red-500 hover:bg-white hover:text-red-700 dark:bg-white dark:hover:bg-white"
                        aria-label={
                            value !== "" ? clearLabel : emptyAction?.label
                        }
                    >
                        {value !== "" ? (
                            <Eraser className="h-4 w-4 text-[var(--color-blue-600)]" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </div>
            {isOpen && predictions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md bg-white text-sm shadow-lg dark:bg-zinc-900">
                    {predictions.map((prediction) => (
                        <li
                            key={prediction.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() =>
                                handleSelectPrediction(prediction.description)
                            }
                            className="cursor-pointer border-b border-gray-100 px-4 py-2 text-gray-800 last:border-none first:rounded-t-md last:rounded-b-md hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-zinc-700"
                        >
                            <div className="font-medium">
                                {prediction.mainText}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {prediction.secondaryText}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatDuration(duration: string): string {
    const seconds = Number.parseFloat(duration);
    if (!Number.isFinite(seconds)) return duration;

    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `約${hours}時間${minutes}分` : `約${minutes}分`;
}

export default function RouteSearchSection({
    routeNumber,
    distance,
    tollFee,
    distanceError,
    tollFeeError,
    origin,
    destination,
    originError,
    destinationError,
    locationErrorsResetKey,
    onDistanceChange,
    onTollFeeChange,
    onOriginChange,
    onDestinationChange,
    onDistanceErrorClear,
    onTollFeeErrorClear,
    onOriginErrorClear,
    onDestinationErrorClear,
    onAddReturnRoute,
    initialIntermediates,
    onAddRoute,
    onRemove,
}: {
    routeNumber: number;
    distance: string;
    tollFee: string;
    distanceError?: string;
    tollFeeError?: string;
    origin: string;
    destination: string;
    originError?: string;
    destinationError?: string;
    locationErrorsResetKey: number;
    onDistanceChange: (value: string) => void;
    onTollFeeChange: (value: string) => void;
    onOriginChange: (value: string) => void;
    onDestinationChange: (value: string) => void;
    onDistanceErrorClear: () => void;
    onTollFeeErrorClear?: () => void;
    onOriginErrorClear?: () => void;
    onDestinationErrorClear?: () => void;
    onAddReturnRoute?: (intermediates: string[]) => void;
    initialIntermediates?: string[];
    onAddRoute?: () => void;
    onRemove?: () => void;
}) {
    const [originPoint, setOriginPoint] = useState<MapPoint | null>(null);
    const [destinationPoint, setDestinationPoint] = useState<MapPoint | null>(
        null,
    );
    const [intermediates, setIntermediates] = useState<string[]>(
        initialIntermediates ?? [],
    );
    const [intermediatePoints, setIntermediatePoints] = useState<
        Array<MapPoint | null>
    >([]);
    const [mapFocusPoint, setMapFocusPoint] = useState<MapPoint | null>(null);
    const [mapSelectionTarget, setMapSelectionTarget] =
        useState<MapSelectionTarget | null>(null);
    const [avoidTolls, setAvoidTolls] = useState(false);
    const [avoidHighways, setAvoidHighways] = useState(false);
    const [tollPass, setTollPass] = useState<"" | "JP_ETC" | "JP_ETC2">(
        "JP_ETC",
    );
    const [routeSearchError, setRouteSearchError] = useState("");
    const [localOriginError, setLocalOriginError] = useState<
        string | undefined
    >(undefined);
    const [localDestinationError, setLocalDestinationError] = useState<
        string | undefined
    >(undefined);
    const [routeCandidates, setRouteCandidates] = useState<RouteCandidate[]>(
        [],
    );
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [isSearchingRoutes, setIsSearchingRoutes] = useState(false);
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

    useEffect(() => {
        setLocalOriginError(undefined);
        setLocalDestinationError(undefined);
    }, [locationErrorsResetKey]);

    const clearRouteSearch = () => {
        setRouteCandidates([]);
        setSelectedRouteId(null);
        setLocalOriginError(undefined);
        setLocalDestinationError(undefined);
    };

    const handleSelectMapLocation = (address: string, point: MapPoint) => {
        if (!mapSelectionTarget) return;

        if (mapSelectionTarget.type === "origin") {
            onOriginChange(address);
            setOriginPoint(point);
            onOriginErrorClear?.();
        } else if (mapSelectionTarget.type === "destination") {
            onDestinationChange(address);
            setDestinationPoint(point);
            onDestinationErrorClear?.();
        } else {
            setIntermediates((current) =>
                current.map((place, index) =>
                    index === mapSelectionTarget.index ? address : place,
                ),
            );
            setIntermediatePoints((current) =>
                current.map((currentPoint, index) =>
                    index === mapSelectionTarget.index ? point : currentPoint,
                ),
            );
        }

        setMapFocusPoint(point);
        clearRouteSearch();
    };

    const addIntermediate = () => {
        setIntermediates((current) => [...current, ""]);
        setIntermediatePoints((current) => [...current, null]);
    };

    const removeIntermediate = (index: number) => {
        if (mapSelectionTarget?.type === "intermediate") {
            if (mapSelectionTarget.index === index) {
                setMapSelectionTarget(null);
            } else if (mapSelectionTarget.index > index) {
                setMapSelectionTarget({
                    type: "intermediate",
                    index: mapSelectionTarget.index - 1,
                });
            }
        }
        setIntermediates((current) =>
            current.filter((_, itemIndex) => itemIndex !== index),
        );
        setIntermediatePoints((current) =>
            current.filter((_, itemIndex) => itemIndex !== index),
        );
        clearRouteSearch();
    };

    const updateIntermediate = (index: number, value: string) => {
        setIntermediates((current) =>
            current.map((place, itemIndex) =>
                itemIndex === index ? value : place,
            ),
        );
        setIntermediatePoints((current) =>
            current.map((point, itemIndex) =>
                itemIndex === index ? null : point,
            ),
        );
        clearRouteSearch();
    };

    const mapLocations = useMemo(
        () => [
            ...(originPoint ? [{ point: originPoint, title: "出発地" }] : []),
            ...(destinationPoint
                ? [{ point: destinationPoint, title: "到着地" }]
                : []),
            ...intermediatePoints.flatMap((point, index) =>
                point ? [{ point, title: `経由地 ${index + 1}` }] : [],
            ),
        ],
        [originPoint, destinationPoint, intermediatePoints],
    );

    const handleSearchRoute = async () => {
        let hasError = false;

        const org = origin ?? "";
        const dst = destination ?? "";

        if (!org.trim()) {
            setLocalOriginError("出発地を入力してください");
            hasError = true;
        } else {
            setLocalOriginError(undefined);
        }

        if (!dst.trim()) {
            setLocalDestinationError("目的地を入力してください");
            hasError = true;
        } else {
            setLocalDestinationError(undefined);
        }

        if (hasError) {
            return;
        }
        setLocalOriginError(undefined);
        setLocalDestinationError(undefined);
        setRouteCandidates([]);
        setSelectedRouteId(null);
        setIsSearchingRoutes(true);
        setMapFocusPoint(null);
        onDistanceChange("");
        onTollFeeChange("");
        try {
            const response = await fetch("/api/routes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    origin: origin.trim(),
                    destination: destination.trim(),
                    intermediates: intermediates
                        .map((place) => place.trim())
                        .filter(Boolean),
                    avoidTolls,
                    avoidHighways,
                    tollPass: tollPass || undefined,
                }),
            });
            const result: unknown = await response.json();
            if (!isRecord(result)) {
                throw new TypeError("Route search response must be an object");
            }
            if (!response.ok) {
                setRouteSearchError(
                    typeof result.error === "string"
                        ? result.error
                        : "ルート検索に失敗しました。",
                );
                return;
            }
            if (!Array.isArray(result.routes)) {
                throw new TypeError(
                    "Route search response must contain routes",
                );
            }

            const candidates = result.routes.filter(
                (route): route is RouteCandidate =>
                    isRecord(route) &&
                    typeof route.id === "string" &&
                    typeof route.description === "string" &&
                    typeof route.distanceKm === "number" &&
                    typeof route.encodedPolyline === "string" &&
                    (typeof route.tollFeeYen === "number" ||
                        route.tollFeeYen === null) &&
                    (typeof route.duration === "string" ||
                        route.duration === null),
            );
            setRouteCandidates(candidates);
            if (candidates.length === 0) {
                setRouteSearchError(
                    "候補ルートが見つかりませんでした。入力内容をご確認ください。",
                );
            }
        } catch (error) {
            console.error("Failed to search routes", error);
            setRouteSearchError(
                "ルート検索に失敗しました。時間をおいて再度お試しください。",
            );
        } finally {
            setIsSearchingRoutes(false);
        }
    };

    const handleSelectRoute = (route: RouteCandidate) => {
        onDistanceChange(String(route.distanceKm));
        const fee =
            route.tollFeeYen === null ? 0 : Math.round(route.tollFeeYen);
        onTollFeeChange(String(fee));
        onDistanceErrorClear();
        setSelectedRouteId(route.id);
    };

    const hasRouteData = Boolean(
        origin ||
        destination ||
        distance ||
        tollFee ||
        intermediates.some(Boolean) ||
        originPoint ||
        destinationPoint ||
        intermediatePoints.some(Boolean),
    );

    const handleClearRoute = () => {
        onOriginChange("");
        onDestinationChange("");
        onDistanceChange("");
        onTollFeeChange("");
        onOriginErrorClear?.();
        onDestinationErrorClear?.();
        onDistanceErrorClear();
        onTollFeeErrorClear?.();
        setOriginPoint(null);
        setDestinationPoint(null);
        setIntermediates([]);
        setIntermediatePoints([]);
        setMapFocusPoint(null);
        setMapSelectionTarget(null);
        setAvoidTolls(false);
        setAvoidHighways(false);
        setTollPass("JP_ETC");
        setRouteSearchError("");
        clearRouteSearch();
    };

    return (
        <section className="space-y-4 rounded-lg bg-gray-100 px-4 py-8 dark:bg-zinc-800">
            <div className="relative mt-2 mb-8 flex min-h-7 items-center justify-center">
                <h2 className="text-center text-xl font-bold text-gray-800 dark:text-gray-200">
                    走行経路 {routeNumber}
                </h2>
                {(hasRouteData || onRemove) && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={hasRouteData ? handleClearRoute : onRemove}
                        className="absolute right-0 h-10 w-10 bg-white text-red-500 hover:bg-white hover:text-red-700 dark:bg-white dark:hover:bg-white"
                        aria-label={
                            hasRouteData
                                ? `走行経路 ${routeNumber} をクリア`
                                : `走行経路 ${routeNumber} を削除`
                        }
                    >
                        {hasRouteData ? (
                            <Eraser className="h-4 w-4 text-[var(--color-blue-600)]" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    出発地
                </label>
                <PlaceAutocompleteInput
                    value={origin}
                    onChange={(value) => {
                        onOriginChange(value);
                        setOriginPoint(null);
                        onOriginErrorClear?.();
                        clearRouteSearch();
                    }}
                    onLocationResolved={(point) => {
                        setOriginPoint(point);
                        setMapFocusPoint(point);
                    }}
                    placeholder="例: 東京駅"
                    clearLabel="出発地をクリア"
                    apiKey={apiKey}
                    onActivate={() => setMapSelectionTarget({ type: "origin" })}
                    className={`h-10 w-full rounded-md bg-white px-4 py-2 focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-white ${
                        originError || localOriginError
                            ? "focus:ring-red-500 border border-red-500"
                            : "focus:ring-blue-500"
                    }`}
                />
                {(originError || localOriginError) && (
                    <p className="mt-1 text-sm text-red-500">
                        {originError || localOriginError}
                    </p>
                )}
                {mapSelectionTarget?.type === "origin" && (
                    <MapLocationPicker
                        key="origin"
                        apiKey={apiKey}
                        initialPoint={originPoint}
                        title="出発地を選択"
                        onSelect={handleSelectMapLocation}
                        onClose={() => setMapSelectionTarget(null)}
                    />
                )}
            </div>

            {intermediates.map((place, index) => (
                <div key={index}>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        経由地 {index + 1}
                    </label>
                    <PlaceAutocompleteInput
                        value={place}
                        onChange={(value) => updateIntermediate(index, value)}
                        onLocationResolved={(point) => {
                            setIntermediatePoints((current) =>
                                current.map((currentPoint, itemIndex) =>
                                    itemIndex === index ? point : currentPoint,
                                ),
                            );
                            setMapFocusPoint(point);
                        }}
                        placeholder="住所または地名"
                        clearLabel={`経由地 ${index + 1} をクリア`}
                        emptyAction={{
                            label: `経由地 ${index + 1} を削除`,
                            onClick: () => removeIntermediate(index),
                        }}
                        apiKey={apiKey}
                        onActivate={() =>
                            setMapSelectionTarget({
                                type: "intermediate",
                                index,
                            })
                        }
                        className="h-10 w-full rounded-md bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900 dark:text-white"
                    />
                    {mapSelectionTarget?.type === "intermediate" &&
                        mapSelectionTarget.index === index && (
                            <MapLocationPicker
                                key={`intermediate-${index}`}
                                apiKey={apiKey}
                                initialPoint={intermediatePoints[index] ?? null}
                                title={`経由地 ${index + 1} を選択`}
                                onSelect={handleSelectMapLocation}
                                onClose={() => setMapSelectionTarget(null)}
                            />
                        )}
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={addIntermediate}
                className="h-10 w-full rounded-md border-dashed border-gray-300 bg-gray-100 text-sm font-semibold text-gray-500 hover:bg-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
                <Plus className="size-4" />
                経由地を追加
            </Button>

            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    目的地
                </label>
                <PlaceAutocompleteInput
                    value={destination}
                    onChange={(value) => {
                        onDestinationChange(value);
                        setDestinationPoint(null);
                        onDestinationErrorClear?.();
                        clearRouteSearch();
                    }}
                    onLocationResolved={(point) => {
                        setDestinationPoint(point);
                        setMapFocusPoint(point);
                    }}
                    placeholder="例: 大阪駅"
                    clearLabel="目的地をクリア"
                    apiKey={apiKey}
                    onActivate={() =>
                        setMapSelectionTarget({ type: "destination" })
                    }
                    className={`h-10 w-full rounded-md bg-white px-4 py-2 focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-white ${
                        destinationError || localDestinationError
                            ? "focus:ring-red-500 border border-red-500"
                            : "focus:ring-blue-500"
                    }`}
                />
                {(destinationError || localDestinationError) && (
                    <p className="mt-1 text-sm text-red-500">
                        {destinationError || localDestinationError}
                    </p>
                )}
                {mapSelectionTarget?.type === "destination" && (
                    <MapLocationPicker
                        key="destination"
                        apiKey={apiKey}
                        initialPoint={destinationPoint}
                        title="目的地を選択"
                        onSelect={handleSelectMapLocation}
                        onClose={() => setMapSelectionTarget(null)}
                    />
                )}
            </div>

<fieldset
    className="@container flex flex-nowrap items-center justify-start gap-3 sm:gap-4"
    style={{ containerType: "inline-size" }}
>
    <label
        className="flex shrink-0 items-center gap-1.5 text-gray-700 sm:gap-2 dark:text-gray-300"
        style={{ fontSize: "clamp(10px, 3.8cqi, 0.875rem)" }}
    >
        <input
            type="checkbox"
            checked={avoidTolls}
            onChange={(event) => {
                setAvoidTolls(event.target.checked);
                clearRouteSearch();
            }}
            className="h-[1.15em] w-[1.15em] shrink-0 accent-blue-600"
        />
        <span className="whitespace-nowrap">有料の道路を避ける</span>
    </label>
    <label
        className="flex shrink-0 items-center gap-1.5 text-gray-700 sm:gap-2 dark:text-gray-300"
        style={{ fontSize: "clamp(10px, 3.8cqi, 0.875rem)" }}
    >
        <input
            type="checkbox"
            checked={avoidHighways}
            onChange={(event) => {
                setAvoidHighways(event.target.checked);
                clearRouteSearch();
            }}
            className="h-[1.15em] w-[1.15em] shrink-0 accent-blue-600"
        />
        <span className="whitespace-nowrap">高速道路のみ避ける</span>
    </label>
</fieldset>

{/* 1. fieldset に @container を追加し、狭い画面用に gap を少し調整 */}
<fieldset className="@container flex flex-nowrap items-center justify-start gap-3 sm:gap-4">
    {(
        [
            { value: "JP_ETC", label: "ETCを使用" },
            { value: "JP_ETC2", label: "ETC2.0を使用" },
            { value: "", label: "ETCを使用しない" },
        ] as const
    ).map(({ value, label }) => (
        <label
            key={value || "cash"}
            /* 2. shrink-0 を指定して文字が勝手に潰れないようにし、fontSize に cqi を使用 */
            className="flex shrink-0 items-center gap-1.5 text-gray-700 sm:gap-2 dark:text-gray-300"
            style={{ fontSize: "clamp(10px, 3.8cqi, 0.875rem)" }}
        >
            <input
                type="radio"
                name={`toll-pass-${routeNumber}`}
                value={value}
                checked={tollPass === value}
                onChange={() => {
                    setTollPass(value);
                    clearRouteSearch();
                }}
                /* 3. ラジオボタン自体も文字サイズに合わせて少しだけ伸縮させるとバランスが良いです */
                className="h-[1.15em] w-[1.15em] shrink-0 accent-blue-600"
            />
            <span className="whitespace-nowrap">{label}</span>
        </label>
    ))}
</fieldset>
            {routeSearchError && (
                <p className="text-xs text-red-500">{routeSearchError}</p>
            )}
            <button
                type="button"
                onClick={handleSearchRoute}
                disabled={isSearchingRoutes}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
                {isSearchingRoutes ? "ルートを検索中..." : "ルート候補を検索"}
            </button>
            {routeCandidates.length > 0 && (
                <div className="space-y-2">
                    <InteractiveRouteMap
                        routes={routeCandidates}
                        selectedRouteId={selectedRouteId}
                        onSelectRoute={handleSelectRoute}
                        locations={mapLocations}
                        focusPoint={mapFocusPoint}
                        apiKey={apiKey}
                    />
                </div>
            )}
            {routeCandidates.length > 0 && (
                <div className="space-y-2" aria-label="ルート候補">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        地図上のルート線をクリック、または、下記候補からルートを選択してください。
                    </p>
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                        {routeCandidates.map((route, index) => (
                            <button
                                key={route.id}
                                type="button"
                                aria-pressed={selectedRouteId === route.id}
                                onClick={() => handleSelectRoute(route)}
                                className={`w-full rounded-md border p-3 text-left transition-colors ${
                                    selectedRouteId === route.id
                                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                                        : "border-gray-300 bg-white hover:border-blue-400 dark:border-gray-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                }`}
                            >
                                <span className="block font-medium text-gray-800 dark:text-gray-200">
                                    ルート候補 {index + 1}
                                    {route.description
                                        ? `：${route.description}`
                                        : ""}
                                </span>
                                <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
                                    走行距離 {route.distanceKm} km
                                    {" / 有料道路料金 "}
                                    {route.tollFeeYen === null
                                        ? "料金情報なし"
                                        : `${Math.round(route.tollFeeYen).toLocaleString()} 円（目安）`}
                                    {route.duration
                                        ? ` / ${formatDuration(route.duration)}`
                                        : ""}
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        *
                        選択した候補の距離と有料道路料金が入力欄に反映されます。手動入力も可能です。
                    </p>
                </div>
            )}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        走行距離
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={distance}
                            onChange={(event) => {
                                const converted = toHalfWidth(
                                    event.target.value,
                                );
                                onDistanceChange(converted);
                                if (distanceError) onDistanceErrorClear();
                            }}
                            onBlur={(event) => {
                                const val = toHalfWidth(
                                    event.target.value,
                                ).replace(/,/g, "");
                                if (val !== "") {
                                    const num = Number.parseFloat(val);
                                    if (!Number.isNaN(num)) {
                                        const parts = val.split(".");
                                        const formattedInt = Number.parseInt(
                                            parts[0] || "0",
                                            10,
                                        ).toLocaleString();
                                        const formatted =
                                            parts.length > 1
                                                ? `${formattedInt}.${parts[1]}`
                                                : formattedInt;
                                        onDistanceChange(formatted);
                                    }
                                }
                            }}
                            placeholder="例: 100"
                            className={`h-10 w-full rounded-md bg-white px-4 py-2 pr-10 sm:pr-12 focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-white text-sm ${
                                distanceError
                                    ? "focus:ring-red-500 border border-red-500"
                                    : "focus:ring-blue-500"
                            }`}
                        />
                        <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                            km
                        </span>
                    </div>
                    {distanceError && (
                        <p className="mt-2 text-xs sm:text-sm text-red-500">
                            {distanceError}
                        </p>
                    )}
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        有料道路料金
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={tollFee}
                            onChange={(event) => {
                                const converted = toHalfWidth(
                                    event.target.value,
                                );
                                onTollFeeChange(converted);
                                if (tollFeeError) onTollFeeErrorClear?.();
                            }}
                            onBlur={(event) => {
                                const val = toHalfWidth(
                                    event.target.value,
                                ).replace(/,/g, "");
                                if (val !== "") {
                                    const num = Number.parseInt(val, 10);
                                    if (!Number.isNaN(num)) {
                                        onTollFeeChange(num.toLocaleString());
                                    }
                                }
                            }}
                            placeholder="例: 1,000"
                            className={`h-10 w-full rounded-md bg-white px-4 py-2 pr-10 sm:pr-12 focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-white text-sm ${
                                tollFeeError
                                    ? "focus:ring-red-500 border border-red-500"
                                    : "focus:ring-blue-500"
                            }`}
                        />
                        <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                            円
                        </span>
                    </div>
                    {tollFeeError && (
                        <p className="mt-2 text-xs sm:text-sm text-red-500">
                            {tollFeeError}
                        </p>
                    )}
                </div>
            </div>
            {onAddReturnRoute && (
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() =>
                        onAddReturnRoute([...intermediates].reverse())
                    }
                    className="mt-4 h-auto min-h-10 w-full whitespace-normal rounded-md border-dashed border-gray-300 bg-gray-100 text-sm font-semibold text-gray-500 hover:bg-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                    <Plus className="size-4" />
                    この経路の復路を 走行経路 {routeNumber + 1} に追加
                </Button>
            )}
            {onAddRoute && (
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onAddRoute}
                    className="h-10 w-full rounded-md border-dashed border-gray-300 bg-gray-100 text-sm font-semibold text-gray-500 hover:bg-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                    <Plus className="size-4" />
                    新しい走行経路を追加
                </Button>
            )}
        </section>
    );
}
