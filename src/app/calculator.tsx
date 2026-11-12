"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import InteractiveRouteMap, {
  fetchPlacePredictions,
  type MapPoint,
  type MapTarget,
  type PlaceAutocompletePrediction,
  type RouteCandidate,
} from "./interactive-route-map";

type OtherInput = { name: string; amount: string };
type CalculatedOther = { name: string; amount: number };
type CalculatorInputs = {
  gasPrice: string;
  fuelEfficiency: string;
  passengers: string;
  routes: string[];
  tollFees: string[];
  parkingFees: string[];
  others: OtherInput[];
};

type CalculationResult = {
  totalDistance: number;
  fuelPerKm: number;
  fuelCost: number;
  totalTollFee: number;
  totalParkingFee: number;
  totalOthersFee: number;
  calculatedOthers: CalculatedOther[];
  totalCost: number;
  costPerPerson: number;
};

type RestoredData = {
  inputs: CalculatorInputs;
  result: CalculationResult | null;
};

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, string | number>,
    ) => void;
  }
}

type PlaceAutocompleteInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  apiKey: string;
};

function PlaceAutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
  apiKey,
}: PlaceAutocompleteInputProps) {
  const [predictions, setPredictions] = useState<PlaceAutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const predictionRequestRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = async (newValue: string) => {
    onChange(newValue);
    const requestId = ++predictionRequestRef.current;
    if (!newValue.trim() || !apiKey) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    try {
      const results = await fetchPlacePredictions(apiKey, newValue);
      if (requestId !== predictionRequestRef.current) return;
      setPredictions(results);
      setIsOpen(results.length > 0);
    } catch (error) {
      if (requestId !== predictionRequestRef.current) return;
      console.error("Failed to fetch Google Places suggestions", error);
      setPredictions([]);
      setIsOpen(false);
    }
  };

  const handleSelectPrediction = (description: string) => {
    predictionRequestRef.current += 1;
    onChange(description);
    setIsOpen(false);
    setPredictions([]);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (predictions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        className={`bg-white ${className}`}
      />
      {isOpen && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-zinc-800 border border-gray-300 dark:border-gray-700 shadow-lg text-sm">
          {predictions.map((prediction) => (
            <li
              key={prediction.id}
              onClick={() => handleSelectPrediction(prediction.description)}
              className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 last:border-none"
            >
              <div className="font-medium">{prediction.mainText}</div>
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

function sumOptionalAmounts(values: string[]): number {
  return values.reduce((total, value) => {
    const amount = value === "" ? 0 : Number.parseFloat(value);
    return total + (Number.isNaN(amount) ? 0 : amount);
  }, 0);
}

function formatDuration(duration: string): string {
  const seconds = Number.parseFloat(duration);
  if (!Number.isFinite(seconds)) return duration;

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `約${hours}時間${minutes}分` : `約${minutes}分`;
}

function calculateInitialResult(inputs: CalculatorInputs): CalculationResult | null {
  const gasPrice = Number.parseFloat(inputs.gasPrice);
  const fuelEfficiency = Number.parseFloat(inputs.fuelEfficiency);
  const passengers = Number.parseInt(inputs.passengers, 10);
  const totalDistance = inputs.routes.reduce((total, route) => {
    const distance = Number.parseFloat(route);
    return total + (Number.isNaN(distance) ? 0 : distance);
  }, 0);

  if (
    !Number.isFinite(gasPrice) || gasPrice <= 0 ||
    !Number.isFinite(fuelEfficiency) || fuelEfficiency <= 0 ||
    !Number.isFinite(passengers) || passengers < 1 ||
    totalDistance <= 0
  ) {
    return null;
  }

  const totalTollFee = sumOptionalAmounts(inputs.tollFees);
  const totalParkingFee = sumOptionalAmounts(inputs.parkingFees);
  const calculatedOthers = inputs.others.flatMap((other, index) => {
    const amount = other.amount === "" ? 0 : Number.parseFloat(other.amount);
    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    return safeAmount > 0 || other.name !== ""
      ? [{ name: other.name || `その他 ${index + 1}`, amount: safeAmount }]
      : [];
  });
  const totalOthersFee = sumOptionalAmounts(inputs.others.map(({ amount }) => amount));
  const fuelCost = (totalDistance / fuelEfficiency) * gasPrice;
  const totalCost = fuelCost + totalTollFee + totalParkingFee + totalOthersFee;

  return {
    totalDistance: Math.round(totalDistance * 10) / 10,
    fuelPerKm: Math.round((gasPrice / fuelEfficiency) * 10) / 10,
    fuelCost: Math.round(fuelCost * 10) / 10,
    totalTollFee,
    totalParkingFee,
    totalOthersFee,
    calculatedOthers,
    totalCost: Math.round(totalCost * 10) / 10,
    costPerPerson: Math.round((totalCost / passengers) * 10) / 10,
  };
}

function parseSharedData(data: string | null): RestoredData | null {
  if (!data) return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(data)));
    if (!isRecord(parsed)) {
      throw new TypeError("Shared calculator data must be an object");
    }

    const getString = (key: string): string => {
      const value = parsed[key];
      if (value === undefined) return "";
      if (typeof value !== "string") {
        throw new TypeError(`Shared calculator field "${key}" must be a string`);
      }
      return value;
    };

    const getStringArray = (key: string): string[] => {
      const value = parsed[key];
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        return [""];
      }
      if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        throw new TypeError(`Shared calculator field "${key}" must be an array of strings`);
      }
      return value;
    };

    const othersValue = parsed.others;
    let others: OtherInput[] = [{ name: "", amount: "" }];
    if (othersValue !== undefined && !(Array.isArray(othersValue) && othersValue.length === 0)) {
      if (!Array.isArray(othersValue) || !othersValue.every(
        (item) => isRecord(item) && typeof item.name === "string" && typeof item.amount === "string",
      )) {
        throw new TypeError('Shared calculator field "others" must contain name and amount strings');
      }
      others = othersValue;
    }

    const routes = getStringArray("routes");
    const tollFees = getStringArray("tollFees");
    const routeCount = Math.max(routes.length, tollFees.length);
    const inputs: CalculatorInputs = {
      gasPrice: getString("gasPrice"),
      fuelEfficiency: getString("fuelEfficiency"),
      passengers: getString("passengers"),
      routes: [...routes, ...Array(Math.max(0, routeCount - routes.length)).fill("")],
      tollFees: [...tollFees, ...Array(Math.max(0, routeCount - tollFees.length)).fill("")],
      parkingFees: getStringArray("parkingFees"),
      others,
    };

    return { inputs, result: calculateInitialResult(inputs) };
  } catch (error) {
    console.error("Failed to parse URL params", error);
    return null;
  }
}

export default function Home() {
  const searchParams = useSearchParams();
  const [restoredData] = useState(() => parseSharedData(searchParams.get("data")));

  // 入力値の状態管理
  const [gasPrice, setGasPrice] = useState<string>(restoredData?.inputs.gasPrice ?? "");
  const [fuelEfficiency, setFuelEfficiency] = useState<string>(restoredData?.inputs.fuelEfficiency ?? "");
  // ルート検索用の状態
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [intermediates, setIntermediates] = useState<string[]>([]);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [tollPass, setTollPass] = useState<"" | "JP_ETC" | "JP_ETC2">("JP_ETC");
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [routeSearchError, setRouteSearchError] = useState("");
  const [routeCandidates, setRouteCandidates] = useState<RouteCandidate[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isSearchingRoutes, setIsSearchingRoutes] = useState(false);

  const clearRouteSearch = () => {
    setRouteCandidates([]);
    setSelectedRouteId(null);
    setRouteSearchError("");
  };

  const addIntermediate = () => {
    setIntermediates((current) => [...current, ""]);
    openMapFor(`via-${intermediates.length}`);
  };

  const removeIntermediate = (index: number) => {
    setIntermediates((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMapTarget(null);
    clearRouteSearch();
  };

  const updateIntermediate = (index: number, value: string) => {
    setIntermediates((current) => current.map((place, itemIndex) => itemIndex === index ? value : place));
    clearRouteSearch();
  };

  const formatMapPoint = ({ lat, lng }: MapPoint) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

  const openMapFor = (target: MapTarget) => {
    setMapTarget(target);
  };

  const parseMapPoint = (value: string): MapPoint | null => {
    const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) return null;
    return { lat: Number(match[1]), lng: Number(match[2]) };
  };

  const mapLocations = useMemo(() => [
    { target: "origin" as const, point: parseMapPoint(origin), title: "出発地" },
    { target: "destination" as const, point: parseMapPoint(destination), title: "目的地" },
    ...intermediates.map((place, index) => ({
      target: `via-${index}` as const,
      point: parseMapPoint(place),
      title: `経由地 ${index + 1}`,
    })),
  ].flatMap(({ target, point, title }) => point ? [{ target, point, title }] : []), [
    origin,
    destination,
    intermediates,
  ]);

  const handlePickLocation = (target: MapTarget, point: MapPoint) => {
    const value = formatMapPoint(point);
    if (target === "origin") setOrigin(value);
    else if (target === "destination") setDestination(value);
    else {
      const index = Number(target.slice("via-".length));
      setIntermediates((current) => current.map((place, itemIndex) => itemIndex === index ? value : place));
    }
    clearRouteSearch();
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setRouteSearchError("このブラウザーでは現在地を取得できません。");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin(formatMapPoint({ lat: coords.latitude, lng: coords.longitude }));
        setMapTarget(null);
        clearRouteSearch();
      },
      () => {
        // 位置情報の取得失敗（ユーザー拒否やHTTPS非対応など）は開発コンソールへのエラー出力を省略し、UIメッセージのみに留める
        setRouteSearchError("現在地を取得できませんでした。位置情報の許可をご確認ください。");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSearchRoute = async () => {
    if (!origin.trim() || !destination.trim()) {
      setRouteSearchError("出発地と目的地を入力してください");
      return;
    }
    setRouteSearchError("");
    setRouteCandidates([]);
    setSelectedRouteId(null);
    setIsSearchingRoutes(true);
    const updatedRoutes = [...routes];
    updatedRoutes[0] = "";
    setRoutes(updatedRoutes);
    const updatedTollFees = [...tollFees];
    updatedTollFees[0] = "";
    setTollFees(updatedTollFees);
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
          intermediates: intermediates.map((place) => place.trim()).filter(Boolean),
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
          typeof result.error === "string" ? result.error : "ルート検索に失敗しました。",
        );
        return;
      }
      if (!Array.isArray(result.routes)) {
        throw new TypeError("Route search response must contain routes");
      }

      const candidates = result.routes.filter((route): route is RouteCandidate =>
        isRecord(route) &&
        typeof route.id === "string" &&
        typeof route.description === "string" &&
        typeof route.distanceKm === "number" &&
        typeof route.encodedPolyline === "string" &&
        (typeof route.tollFeeYen === "number" || route.tollFeeYen === null) &&
        (typeof route.duration === "string" || route.duration === null),
      );
      setRouteCandidates(candidates);
      if (candidates.length === 0) {
        setRouteSearchError("候補ルートが見つかりませんでした。入力内容をご確認ください。");
      }
    } catch (error) {
      console.error("Failed to search routes", error);
      setRouteSearchError("ルート検索に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSearchingRoutes(false);
    }
  };

  const handleSelectRoute = (route: RouteCandidate) => {
    const updatedRoutes = [...routes];
    updatedRoutes[0] = String(route.distanceKm);
    setRoutes(updatedRoutes);
    const updatedTollFees = [...tollFees];
    updatedTollFees[0] = route.tollFeeYen === null ? "" : String(Math.round(route.tollFeeYen));
    setTollFees(updatedTollFees);
    setSelectedRouteId(route.id);
    if (errors.routes?.[0]) {
      const updatedRouteErrors = [...errors.routes];
      updatedRouteErrors[0] = undefined;
      setErrors({ ...errors, routes: updatedRouteErrors });
    }
  };


  const [passengers, setPassengers] = useState<string>(restoredData?.inputs.passengers ?? "");
  const [routes, setRoutes] = useState<string[]>(restoredData?.inputs.routes ?? [""]);
  const [tollFees, setTollFees] = useState<string[]>(restoredData?.inputs.tollFees ?? [""]);
  const [parkingFees, setParkingFees] = useState<string[]>(restoredData?.inputs.parkingFees ?? [""]);
  const [others, setOthers] = useState<OtherInput[]>(restoredData?.inputs.others ?? [{ name: "", amount: "" }]);

  // エラーメッセージの状態管理
  const [errors, setErrors] = useState<{
    gasPrice?: string;
    fuelEfficiency?: string;
    passengers?: string;
    routes?: (string | undefined)[];
  }>({});

  // 計算結果の状態管理
  const [totalDistance, setTotalDistance] = useState<number | null>(restoredData?.result?.totalDistance ?? null);
  const [fuelPerKm, setFuelPerKm] = useState<number | null>(restoredData?.result?.fuelPerKm ?? null);
  const [totalTollFee, setTotalTollFee] = useState<number | null>(restoredData?.result?.totalTollFee ?? null);
  const [totalParkingFee, setTotalParkingFee] = useState<number | null>(restoredData?.result?.totalParkingFee ?? null);
  const [totalOthersFee, setTotalOthersFee] = useState<number | null>(restoredData?.result?.totalOthersFee ?? null);
  const [calculatedOthers, setCalculatedOthers] = useState<CalculatedOther[]>(restoredData?.result?.calculatedOthers ?? []);
  const [fuelCost, setFuelCost] = useState<number | null>(restoredData?.result?.fuelCost ?? null);
  const [totalCost, setTotalCost] = useState<number | null>(restoredData?.result?.totalCost ?? null);
  const [costPerPerson, setCostPerPerson] = useState<number | null>(restoredData?.result?.costPerPerson ?? null);

  // 計算結果セクションへのスクロール用ref
  const resultRef = useRef<HTMLDivElement>(null);

  // 共有URLの計算結果が初期表示されたら、その位置までスクロール
  useEffect(() => {
    if (!restoredData?.result) return;

    const timeoutId = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [restoredData]);

  // 経路を追加する処理
  const addRoute = () => {
    setRoutes([...routes, ""]);
    setTollFees([...tollFees, ""]);
  };

  // 経路を削除する処理
  const removeRoute = (index: number) => {
    if (routes.length > 1) {
      setRoutes(routes.filter((_, i) => i !== index));
      setTollFees(tollFees.filter((_, i) => i !== index));
    }
  };

  // 経路の距離を更新する処理
  const updateRoute = (index: number, value: string) => {
    const newRoutes = [...routes];
    newRoutes[index] = value;
    setRoutes(newRoutes);
  };

  // 有料道路料金を更新する処理
  const updateTollFee = (index: number, value: string) => {
    const newTollFees = [...tollFees];
    newTollFees[index] = value;
    setTollFees(newTollFees);
  };

  // 駐車料金を追加する処理
  const addParkingFee = () => {
    setParkingFees([...parkingFees, ""]);
  };

  // 駐車料金を削除する処理
  const removeParkingFee = (index: number) => {
    if (parkingFees.length > 1) {
      const newParkingFees = parkingFees.filter((_, i) => i !== index);
      setParkingFees(newParkingFees);
    }
  };

  // 駐車料金を更新する処理
  const updateParkingFee = (index: number, value: string) => {
    const newParkingFees = [...parkingFees];
    newParkingFees[index] = value;
    setParkingFees(newParkingFees);
  };

  // その他を追加する処理
  const addOther = () => {
    setOthers([...others, { name: "", amount: "" }]);
  };

  // その他を削除する処理
  const removeOther = (index: number) => {
    if (others.length > 1) {
      const newOthers = others.filter((_, i) => i !== index);
      setOthers(newOthers);
    }
  };

  // その他を更新する処理
  const updateOther = (index: number, field: 'name' | 'amount', value: string) => {
    const newOthers = [...others];
    newOthers[index] = { ...newOthers[index], [field]: value };
    setOthers(newOthers);
  };

  // GA4にイベントを送信する関数
  const sendGAEvent = (eventName: string, params?: Record<string, string | number>) => {
    window.gtag?.("event", eventName, params);
  };

  // 計算ボタンがクリックされた時の処理
  const handleCalculate = () => {
    // GA4にイベントを送信
    sendGAEvent("calculate_button_click", {
      event_category: "engagement",
      event_label: "計算するボタン"
    });

    // エラーをリセット
    setErrors({});

    const newErrors: typeof errors = {};
    let hasError = false;

    // ガソリン価格の検証
    const gasPriceNum = parseFloat(gasPrice);
    if (gasPrice === "" || isNaN(gasPriceNum)) {
      newErrors.gasPrice = "ガソリン価格を入力してください";
      hasError = true;
    } else if (gasPriceNum <= 0) {
      newErrors.gasPrice = "ガソリン価格は正の数を入力してください";
      hasError = true;
    }

    // 燃費の検証
    const fuelEfficiencyNum = parseFloat(fuelEfficiency);
    if (fuelEfficiency === "" || isNaN(fuelEfficiencyNum)) {
      newErrors.fuelEfficiency = "燃費を入力してください";
      hasError = true;
    } else if (fuelEfficiencyNum <= 0) {
      newErrors.fuelEfficiency = "燃費は正の数を入力してください";
      hasError = true;
    }

    // 乗車人数の検証
    const passengersNum = parseInt(passengers);
    if (passengers === "" || isNaN(passengersNum)) {
      newErrors.passengers = "乗車人数を入力してください";
      hasError = true;
    } else if (passengersNum < 1) {
      newErrors.passengers = "乗車人数は1人以上にしてください";
      hasError = true;
    }

    // 走行距離の検証（2以降は任意入力）
    const routeErrors: (string | undefined)[] = [];
    let hasValidRoute = false;
    let totalDistanceNum = 0;

    for (let i = 0; i < routes.length; i++) {
      // 走行距離2以降は空欄を許容
      if (i >= 1 && routes[i] === "") {
        routeErrors[i] = undefined;
        continue;
      }

      const distance = parseFloat(routes[i]);
      if (routes[i] === "" || isNaN(distance)) {
        routeErrors[i] = "有効な数値を入力してください";
        hasError = true;
      } else if (distance < 0) {
        routeErrors[i] = "0以上の数を入力してください";
        hasError = true;
      } else if (distance > 0) {
        hasValidRoute = true;
      }
      totalDistanceNum += isNaN(distance) ? 0 : distance;
    }

    if (routes.length > 0 && !hasValidRoute && routes.every(r => r === "" || parseFloat(r) === 0)) {
      routeErrors[0] = "少なくとも1つの走行距離を入力してください";
      hasError = true;
    }

    if (routeErrors.length > 0) {
      newErrors.routes = routeErrors;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // 計算
    const fuel = totalDistanceNum / fuelEfficiencyNum;
    const cost = fuel * gasPriceNum;
    // 1kmあたりの燃料費
    const fuelPerKmNum = gasPriceNum / fuelEfficiencyNum;
    // 有料道路料金（任意入力なのでデフォルト0）
    let totalTollFeeNum = 0;
    for (const tollFee of tollFees) {
      const tollFeeNum = tollFee === "" || isNaN(parseFloat(tollFee)) ? 0 : parseFloat(tollFee);
      totalTollFeeNum += tollFeeNum;
    }
    // 駐車料金（任意入力なのでデフォルト0）
    let totalParkingFeeNum = 0;
    for (const parkingFee of parkingFees) {
      const parkingFeeNum = parkingFee === "" || isNaN(parseFloat(parkingFee)) ? 0 : parseFloat(parkingFee);
      totalParkingFeeNum += parkingFeeNum;
    }
    // その他（任意入力なのでデフォルト0）
    let totalOthersFeeNum = 0;
    const validOthers: { name: string, amount: number }[] = [];
    for (let i = 0; i < others.length; i++) {
      const other = others[i];
      const otherNum = other.amount === "" || isNaN(parseFloat(other.amount)) ? 0 : parseFloat(other.amount);
      if (otherNum > 0 || other.name !== "") {
        validOthers.push({
          name: other.name || `その他 ${i + 1}`,
          amount: otherNum
        });
      }
      totalOthersFeeNum += otherNum;
    }
    const totalCostWithAll = cost + totalTollFeeNum + totalParkingFeeNum + totalOthersFeeNum;
    const costPer = totalCostWithAll / passengersNum;

    setTotalDistance(Math.round(totalDistanceNum * 10) / 10);
    setFuelPerKm(Math.round(fuelPerKmNum * 10) / 10);
    setFuelCost(Math.round(cost * 10) / 10);
    setTotalTollFee(totalTollFeeNum);
    setTotalParkingFee(totalParkingFeeNum);
    setTotalOthersFee(totalOthersFeeNum);
    setCalculatedOthers(validOthers);
    setTotalCost(Math.round(totalCostWithAll * 10) / 10);
    setCostPerPerson(Math.round(costPer * 10) / 10);

    // 入力値をURLに保存
    try {
      const stateData = {
        gasPrice,
        fuelEfficiency,
        passengers,
        routes,
        tollFees,
        parkingFees,
        others
      };
      const encoded = btoa(encodeURIComponent(JSON.stringify(stateData)));
      const url = new URL(window.location.href);
      url.searchParams.set("data", encoded);
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      console.error("Failed to save URL params", e);
    }

    // 計算結果が表示されたらその位置にスクロール
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // リセットボタンがクリックされた時の処理
  const handleReset = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("data");
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      console.error("Failed to clear URL params", e);
    }
    setGasPrice("");
    setFuelEfficiency("");
    setPassengers("");
    setRoutes([""]);
    setTollFees([""]);
    setParkingFees([""]);
    setOthers([{ name: "", amount: "" }]);
    setErrors({});
    setTotalDistance(null);
    setFuelPerKm(null);
    setFuelCost(null);
    setTotalTollFee(null);
    setTotalParkingFee(null);
    setTotalOthersFee(null);
    setCalculatedOthers([]);
    setTotalCost(null);
    setCostPerPerson(null);
  };

  // LINEで共有する処理
  const handleLineShare = () => {
    // GA4にイベントを送信
    sendGAEvent("line_share_button_click", {
      event_category: "engagement",
      event_label: "LINEで共有するボタン"
    });

    try {
      const stateData = {
        gasPrice,
        fuelEfficiency,
        passengers,
        routes,
        tollFees,
        parkingFees,
        others
      };
      const encoded = btoa(encodeURIComponent(JSON.stringify(stateData)));
      const url = new URL(window.location.href);
      url.searchParams.set("data", encoded);

      const message = `交通費の計算結果\n合計金額: ${totalCost?.toLocaleString()}円\n1人あたり: ${costPerPerson?.toLocaleString()}円\n\n入力データと計算結果を開く:\n${url.toString()}`;
      const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(message)}`;
      window.open(lineUrl, "_blank");
    } catch (e) {
      console.error("Failed to share on LINE", e);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center justify-between py-8 px-4 sm:py-16 sm:px-8 bg-white dark:bg-zinc-900 shadow-lg">
        <div className="w-full">
          <h1 className="flex flex-col items-center justify-center gap-2 mb-16 text-center">
            <svg width="184" height="40" viewBox="0 0 184 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />

              <circle cx="13.75" cy="11.75" r="2.3" fill="#E2E8F0" />
              <circle cx="20" cy="11.75" r="2.3" fill="#38BDF8" />
              <circle cx="26.25" cy="11.75" r="2.3" fill="#E2E8F0" />

              <circle cx="13.75" cy="17.75" r="2.3" fill="#38BDF8" />
              <circle cx="20" cy="17.75" r="2.3" fill="#38BDF8" />
              <circle cx="26.25" cy="17.75" r="2.3" fill="#38BDF8" />

              <circle cx="13.75" cy="23.75" r="2.3" fill="#E2E8F0" />
              <circle cx="20" cy="23.75" r="2.3" fill="#38BDF8" />
              <circle cx="26.25" cy="23.75" r="2.3" fill="#E2E8F0" />

              <circle cx="20" cy="29.75" r="2.3" fill="#38BDF8" />

              <g stroke="#334155" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M 55.5 11.5 V 25.5 C 55.5 28 57 29.2 59.5 29.2 H 61" />
                <path d="M 52 17.5 H 60.5" />

                <path d="M 69.5 29.2 V 17.5" />
                <path d="M 69.5 21.5 C 69.5 18.8 71.8 17.5 74.8 17.5" />

                <path d="M 83.5 18.2 V 29.2" />
                <circle cx="83.5" cy="12" r="1.8" fill="#334155" stroke="none" />

                <path d="M 103 19.2 C 101.8 17.9 100.1 17.3 98.2 17.3 C 94.6 17.3 92.2 19.8 92.2 23.3 C 92.2 26.8 94.6 29.3 98.2 29.3 C 100.1 29.3 101.8 28.7 103 27.4" />

                <circle cx="117.5" cy="23.3" r="6" />

                <path d="M 142.5 19.2 C 141.3 17.9 139.6 17.3 137.7 17.3 C 134.1 17.3 131.7 19.8 131.7 23.3 C 131.7 26.8 134.1 29.3 137.7 29.3 C 139.6 29.3 141.3 28.7 142.5 27.4" />

                <circle cx="157" cy="23.3" r="6" />
                <path d="M 163 17.5 V 29.2" />
              </g>
            </svg>
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">交通費計算</span>
          </h1>

          {/* 入力フォーム */}
          <div className="space-y-6">
            {/* ガソリン価格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ガソリン価格（1Lあたり）
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={gasPrice}
                  onChange={(e) => {
                    setGasPrice(e.target.value);
                    if (errors.gasPrice) {
                      setErrors({ ...errors, gasPrice: undefined });
                    }
                  }}
                  placeholder="例: 150"
                  className={`w-full px-4 py-2 pr-12 border rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 ${errors.gasPrice
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  円
                </span>
              </div>
              {errors.gasPrice && (
                <p className="mt-2 text-sm text-red-500">{errors.gasPrice}</p>
              )}
            </div>

            {/* 燃費 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                車の燃費（1Lあたり）
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={fuelEfficiency}
                  onChange={(e) => {
                    setFuelEfficiency(e.target.value);
                    if (errors.fuelEfficiency) {
                      setErrors({ ...errors, fuelEfficiency: undefined });
                    }
                  }}
                  placeholder="例: 15.0"
                  className={`w-full px-4 py-2 pr-16 border rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 ${errors.fuelEfficiency
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  km/L
                </span>
              </div>
              {errors.fuelEfficiency && (
                <p className="mt-2 text-sm text-red-500">{errors.fuelEfficiency}</p>
              )}
            </div>

            {/* 乗車人数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                乗車人数
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={passengers}
                  onChange={(e) => {
                    setPassengers(e.target.value);
                    if (errors.passengers) {
                      setErrors({ ...errors, passengers: undefined });
                    }
                  }}
                  placeholder="例: 2"
                  className={`w-full px-4 py-2 pr-12 border rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 ${errors.passengers
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  人
                </span>
              </div>
              {errors.passengers && (
                <p className="mt-2 text-sm text-red-500">{errors.passengers}</p>
              )}
            </div>

            {/* 経路 */}
            {/* ルート1検索機能付きセクション */}
            <div className="p-4 bg-gray-100/70 dark:bg-zinc-800/30 rounded-lg space-y-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                ルート 1
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">出発地</label>
                  <PlaceAutocompleteInput
                    value={origin}
                    onChange={(val) => {
                      setOrigin(val);
                      clearRouteSearch();
                    }}
                    placeholder="例: 東京駅"
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
                    className="w-full px-3 py-1.5 text-sm border rounded-md dark:bg-zinc-800 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => openMapFor("origin")}
                    className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline-block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    地図上のピンの位置を使用する
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">目的地</label>
                  <PlaceAutocompleteInput
                    value={destination}
                    onChange={(val) => {
                      setDestination(val);
                      clearRouteSearch();
                    }}
                    placeholder="例: 大阪駅"
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
                    className="w-full px-3 py-1.5 text-sm border rounded-md dark:bg-zinc-800 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => openMapFor("destination")}
                    className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline-block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    地図上のピンの位置を使用する
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-zinc-700"
              >
                現在地を出発地に設定
              </button>

              <div className="space-y-2">
                {intermediates.map((place, index) => (
                  <div key={index}>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      経由地 {index + 1}
                    </label>
                    <div className="flex gap-2">
                      <div className="min-w-0 flex-1">
                        <PlaceAutocompleteInput
                          value={place}
                          onChange={(val) => updateIntermediate(index, val)}
                          placeholder="住所または地名"
                          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
                          className="w-full px-3 py-1.5 text-sm border rounded-md dark:bg-zinc-800 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => openMapFor(`via-${index}`)}
                        className="rounded-md border border-gray-300 px-3 text-xs dark:border-gray-600 dark:text-gray-200 flex items-center gap-1.5 py-1"
                      >
                        <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline-block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        地図で指定
                      </button>
                      <button
                        type="button"
                        onClick={() => removeIntermediate(index)}
                        aria-label={`経由地 ${index + 1} を削除`}
                        className="rounded-md bg-red-500 px-3 text-white hover:bg-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIntermediate}
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  + 経由地を追加
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={avoidTolls}
                    onChange={(event) => {
                      setAvoidTolls(event.target.checked);
                      clearRouteSearch();
                    }}
                    className="h-4 w-4 accent-blue-600"
                  />
                  有料道路をできるだけ避ける
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={avoidHighways}
                    onChange={(event) => {
                      setAvoidHighways(event.target.checked);
                      clearRouteSearch();
                    }}
                    className="h-4 w-4 accent-blue-600"
                  />
                  高速道路をできるだけ避ける
                </label>
              </div>
              <div>
                <label htmlFor="toll-pass" className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  ETCの使用
                </label>
                <select
                  id="toll-pass"
                  value={tollPass}
                  onChange={(event) => {
                    setTollPass(event.target.value as "" | "JP_ETC" | "JP_ETC2");
                    clearRouteSearch();
                  }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="JP_ETC">ETCを使用</option>
                  <option value="JP_ETC2">ETC2.0を使用</option>
                  <option value="">使用しない（現金料金を目安に計算）</option>
                </select>
              </div>
              {routeSearchError && (
                <p className="text-xs text-red-500">{routeSearchError}</p>
              )}
              {mapTarget && (
                <div className="flex items-center justify-between rounded-md bg-blue-50 p-2.5 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 inline-block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    地図をクリックして
                    {mapTarget === "origin" ? "出発地" : mapTarget === "destination" ? "目的地" : `経由地 ${Number(mapTarget.slice(4)) + 1}`}
                    を指定してください。（もう一度クリックすると位置を修正できます）
                  </p>
                  <button
                    type="button"
                    onClick={() => setMapTarget(null)}
                    className="ml-2 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    完了
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSearchRoute}
                  disabled={isSearchingRoutes}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {isSearchingRoutes ? "ルートを検索中..." : "ルート候補を検索"}
                </button>
              </div>
              {routeCandidates.length > 0 && (
                <div className="space-y-2" aria-label="ルート候補">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    候補からルートを選択してください（最大10件）
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
                            : "border-gray-300 bg-white hover:border-blue-400 dark:border-gray-600 dark:bg-zinc-800"
                        }`}
                      >
                        <span className="block font-medium text-gray-800 dark:text-gray-200">
                          ルート候補 {index + 1}{route.description ? `：${route.description}` : ""}
                        </span>
                        <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
                          走行距離 {route.distanceKm} km
                          {" / 有料道路料金 "}
                          {route.tollFeeYen === null
                            ? "料金情報なし"
                            : `${Math.round(route.tollFeeYen).toLocaleString()} 円（目安）`}
                          {route.duration ? ` / ${formatDuration(route.duration)}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ※選択した候補の距離と、有料道路料金の目安を入力欄に反映します。料金情報がない場合は空欄になります。
                  </p>
                </div>
              )}
              <div className="mt-4 space-y-2">
                  <InteractiveRouteMap
                    routes={routeCandidates}
                    selectedRouteId={selectedRouteId}
                    onSelectRoute={handleSelectRoute}
                    mapTarget={mapTarget}
                    onPickLocation={handlePickLocation}
                    locations={mapLocations}
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    地図上のルート線をクリックすると、選択したルートの距離と料金が入力欄に反映されます。
                  </p>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    走行距離 1
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={routes[0] ?? ""}
                      onChange={(e) => {
                        updateRoute(0, e.target.value);
                        if (errors.routes?.[0]) {
                          const newRouteErrors = [...errors.routes];
                          newRouteErrors[0] = undefined;
                          setErrors({ ...errors, routes: newRouteErrors });
                        }
                      }}
                      placeholder="例: 50"
                      className={`w-full px-4 py-2 pr-12 border rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 ${errors.routes?.[0]
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                        }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      km
                    </span>
                  </div>
                  {errors.routes?.[0] && (
                    <p className="mt-2 text-sm text-red-500">{errors.routes[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    有料道路料金 1
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={tollFees[0] ?? ""}
                      onChange={(e) => updateTollFee(0, e.target.value)}
                      placeholder="例: 2000"

                      className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      円
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {routes.slice(1).map((route, offset) => {
              const index = offset + 1;
              return (
                <div key={index} className="p-4 bg-gray-100/70 dark:bg-zinc-800/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      ルート {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeRoute(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        走行距離 {index + 1}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={route}
                          onChange={(e) => {
                            updateRoute(index, e.target.value);
                            if (errors.routes?.[index]) {
                              const newRouteErrors = [...errors.routes];
                              newRouteErrors[index] = undefined;
                              setErrors({ ...errors, routes: newRouteErrors });
                            }
                          }}
                          placeholder="例: 50"
                          className={`w-full px-4 py-2 pr-12 border rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 ${errors.routes?.[index]
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                            }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                          km
                        </span>
                      </div>
                      {errors.routes?.[index] && (
                        <p className="mt-2 text-sm text-red-500">{errors.routes[index]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        有料道路料金 {index + 1}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={tollFees[index] ?? ""}
                          onChange={(e) => updateTollFee(index, e.target.value)}
                          placeholder="例: 2000"
                          className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                          円
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addRoute}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors"
            >
              ルートを追加
            </button>

            {/* 駐車料金 */}
            <div className="space-y-4">
              {parkingFees.map((parkingFee, index) => (
                <div key={index} className="grid grid-cols-1 gap-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    駐車料金 {index + 1}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={parkingFee}
                        onChange={(e) => updateParkingFee(index, e.target.value)}
                        placeholder="例: 1000"
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        円
                      </span>
                    </div>
                    {parkingFees.length > 1 && (
                      <button
                        onClick={() => removeParkingFee(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 駐車料金を追加ボタン */}
            <button
              onClick={addParkingFee}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors"
            >
              駐車料金を追加
            </button>

            {/* その他 */}
            <div className="space-y-4">
              {others.map((other, index) => (
                <div key={index} className="grid grid-cols-1 gap-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    その他 {index + 1}
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full sm:flex-1">
                      <input
                        type="text"
                        value={other.name}
                        onChange={(e) => updateOther(index, 'name', e.target.value)}
                        placeholder="項目名 (例: レンタカー代)"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="relative w-full sm:flex-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={other.amount}
                        onChange={(e) => updateOther(index, 'amount', e.target.value)}
                        placeholder="金額 (例: 5000)"
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        円
                      </span>
                    </div>
                    {others.length > 1 && (
                      <button
                        onClick={() => removeOther(index)}
                        className="w-full sm:w-auto px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* その他を追加ボタン */}
            <button
              onClick={addOther}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors"
            >
              その他を追加
            </button>
          </div>

          {/* ボタン */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleCalculate}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              計算する
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              リセット
            </button>
          </div>

          {/* 計算結果 */}
          {totalDistance !== null && fuelPerKm !== null && fuelCost !== null && totalTollFee !== null && totalParkingFee !== null && totalOthersFee !== null && totalCost !== null && costPerPerson !== null && (
            <div id="calculation-result-section" ref={resultRef} className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4">
                計算結果
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-700 dark:text-gray-300">総走行距離</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{totalDistance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">1kmあたりの燃料費</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{fuelPerKm} 円/km</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-700 dark:text-gray-300">総燃料費</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{fuelCost.toLocaleString()} 円</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">有料道路料金</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{totalTollFee.toLocaleString()} 円</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">駐車料金</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{totalParkingFee.toLocaleString()} 円</span>
                </div>
                {calculatedOthers.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.amount.toLocaleString()} 円</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-700 dark:text-gray-300">合計金額</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">{totalCost.toLocaleString()} 円</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">1人あたりの金額</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{costPerPerson.toLocaleString()} 円</span>
                </div>
                <div className="border-t pt-4 mt-4">
                  <button
                    onClick={handleLineShare}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#06C755] text-white font-medium rounded-md hover:bg-[#05b34c] focus:outline-none focus:ring-2 focus:ring-[#06C755] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="inline-block">
                      <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.586.39.084.922.258 1.057.592.12.3.077.769.038 1.073-.13.993-.566 3.973-.642 4.51-.087.613.167.56.356.37 1.258-1.257 5.786-5.836 7.893-8.28 2.062-2.316 3.262-4.57 3.262-6.851z"/>
                    </svg>
                    LINEで結果を共有する
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
