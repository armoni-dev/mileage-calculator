"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  // 入力値の状態管理
  const [gasPrice, setGasPrice] = useState<string>("");
  const [fuelEfficiency, setFuelEfficiency] = useState<string>("");
  const [passengers, setPassengers] = useState<string>("");
  const [routes, setRoutes] = useState<string[]>([""]);
  const [tollFees, setTollFees] = useState<string[]>([""]);
  const [parkingFees, setParkingFees] = useState<string[]>([""]);
  const [others, setOthers] = useState<{ name: string, amount: string }[]>([{ name: "", amount: "" }]);

  // エラーメッセージの状態管理
  const [errors, setErrors] = useState<{
    gasPrice?: string;
    fuelEfficiency?: string;
    passengers?: string;
    routes?: (string | undefined)[];
  }>({});

  // 計算結果の状態管理
  const [totalDistance, setTotalDistance] = useState<number | null>(null);
  const [fuelPerKm, setFuelPerKm] = useState<number | null>(null);
  const [totalTollFee, setTotalTollFee] = useState<number | null>(null);
  const [totalParkingFee, setTotalParkingFee] = useState<number | null>(null);
  const [totalOthersFee, setTotalOthersFee] = useState<number | null>(null);
  const [calculatedOthers, setCalculatedOthers] = useState<{ name: string, amount: number }[]>([]);
  const [fuelCost, setFuelCost] = useState<number | null>(null);
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [costPerPerson, setCostPerPerson] = useState<number | null>(null);

  // 計算結果セクションへのスクロール用ref
  const resultRef = useRef<HTMLDivElement>(null);

  // 初回読み込み時にURLパラメータから値を復元
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(atob(data)));
        if (parsed.gasPrice !== undefined) setGasPrice(parsed.gasPrice);
        if (parsed.fuelEfficiency !== undefined) setFuelEfficiency(parsed.fuelEfficiency);
        if (parsed.passengers !== undefined) setPassengers(parsed.passengers);
        if (parsed.routes && parsed.routes.length > 0) setRoutes(parsed.routes);
        if (parsed.tollFees && parsed.tollFees.length > 0) setTollFees(parsed.tollFees);
        if (parsed.parkingFees && parsed.parkingFees.length > 0) setParkingFees(parsed.parkingFees);
        if (parsed.others && parsed.others.length > 0) setOthers(parsed.others);
      } catch (e) {
        console.error("Failed to parse URL params", e);
      }
    }
  }, []);

  // 経路を追加する処理
  const addRoute = () => {
    setRoutes([...routes, ""]);
  };

  // 経路を削除する処理
  const removeRoute = (index: number) => {
    if (routes.length > 1) {
      const newRoutes = routes.filter((_, i) => i !== index);
      setRoutes(newRoutes);
    }
  };

  // 経路の距離を更新する処理
  const updateRoute = (index: number, value: string) => {
    const newRoutes = [...routes];
    newRoutes[index] = value;
    setRoutes(newRoutes);
  };

  // 有料道路料金を追加する処理
  const addTollFee = () => {
    setTollFees([...tollFees, ""]);
  };

  // 有料道路料金を削除する処理
  const removeTollFee = (index: number) => {
    if (tollFees.length > 1) {
      const newTollFees = tollFees.filter((_, i) => i !== index);
      setTollFees(newTollFees);
    }
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

  // 計算ボタンがクリックされた時の処理
  const handleCalculate = () => {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center justify-between py-16 px-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg m-4">
        <div className="w-full">
          <h1 className="text-2xl font-bold text-center text-black dark:text-white mb-8">
            交通費計算
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
                  className={`w-full px-4 py-2 pr-12 border rounded-md focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-white ${errors.gasPrice
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
                  className={`w-full px-4 py-2 pr-16 border rounded-md focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-white ${errors.fuelEfficiency
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
                  className={`w-full px-4 py-2 pr-12 border rounded-md focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-white ${errors.passengers
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
            <div className="space-y-4">
              {routes.map((route, index) => (
                <div key={index} className="grid grid-cols-1 gap-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    走行距離 {index + 1}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={route}
                        onChange={(e) => {
                          updateRoute(index, e.target.value);
                          if (errors.routes && errors.routes[index]) {
                            const newRouteErrors = [...errors.routes];
                            newRouteErrors[index] = undefined;
                            setErrors({ ...errors, routes: newRouteErrors });
                          }
                        }}
                        placeholder="例: 50"
                        className={`w-full px-4 py-2 pr-12 border rounded-md focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-white ${errors.routes && errors.routes[index]
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                          }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        km
                      </span>
                    </div>
                    {routes.length > 1 && (
                      <button
                        onClick={() => removeRoute(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  {errors.routes && errors.routes[index] && (
                    <p className="text-sm text-red-500">{errors.routes[index]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* 経路を追加ボタン */}
            <button
              onClick={addRoute}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors"
            >
              走行距離を追加
            </button>

            {/* 有料道路料金 */}
            <div className="space-y-4">
              {tollFees.map((tollFee, index) => (
                <div key={index} className="grid grid-cols-1 gap-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    有料道路料金 {index + 1}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={tollFee}
                        onChange={(e) => updateTollFee(index, e.target.value)}
                        placeholder="例: 2000"
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        円
                      </span>
                    </div>
                    {tollFees.length > 1 && (
                      <button
                        onClick={() => removeTollFee(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 有料道路料金を追加ボタン */}
            <button
              onClick={addTollFee}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors"
            >
              有料道路料金を追加
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
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white"
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white"
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
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-white"
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
            <div ref={resultRef} className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
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
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-700 dark:text-gray-300"></span>
                  <span className="font-semibold text-gray-900 dark:text-white"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
