"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import RouteSearchSection from "./route-search-section";
import VehicleSettings from "@/components/calculator/vehicle-settings";
import OtherExpenses from "@/components/calculator/other-expenses";
import CalculationResult from "@/components/calculator/calculation-result";
import LineLogoIcon from "@/components/calculator/line-logo";
import {
  DEFAULT_OTHERS,
  encodeSharedData,
  parseSharedData,
  validateAndCalculate,
  type CalculatorErrors,
  type CalculatorInputs,
  type CalculationResult as CalculationResultData,
  type OtherInput,
} from "@/lib/calculator";

type CalculatorFormErrors = CalculatorErrors & {
  origins?: (string | undefined)[];
  destinations?: (string | undefined)[];
};

export default function Home() {
  const searchParams = useSearchParams();
  const [restoredData] = useState(() => parseSharedData(searchParams.get("data")));

  // 入力値の状態管理
  const [gasPrice, setGasPrice] = useState<string>(restoredData?.inputs.gasPrice ?? "");
  const [fuelEfficiency, setFuelEfficiency] = useState<string>(restoredData?.inputs.fuelEfficiency ?? "");
  const [passengers, setPassengers] = useState<string>(restoredData?.inputs.passengers ?? "");
  const [discountRates, setDiscountRates] = useState<string[]>(
    restoredData?.inputs.discountRates ?? [""],
  );
  const [routes, setRoutes] = useState<string[]>(restoredData?.inputs.routes ?? [""]);
  const [tollFees, setTollFees] = useState<string[]>(restoredData?.inputs.tollFees ?? [""]);
  const [origins, setOrigins] = useState<string[]>([""]);
  const [destinations, setDestinations] = useState<string[]>([""]);
  const [routeIntermediates, setRouteIntermediates] = useState<string[][]>(() =>
    (restoredData?.inputs.routes ?? [""]).map(() => []),
  );
  const [routeIds, setRouteIds] = useState(() =>
    (restoredData?.inputs.routes ?? [""]).map((_, index) => `route-${index}`),
  );
  const nextRouteIdRef = useRef(routeIds.length);
  const [others, setOthers] = useState<OtherInput[]>(
    restoredData?.inputs.others ?? DEFAULT_OTHERS.map((other) => ({ ...other })),
  );

  // エラーメッセージの状態管理
  const [errors, setErrors] = useState<CalculatorFormErrors>({});
  const [locationErrorsResetKey, setLocationErrorsResetKey] = useState(0);

  // 計算結果の状態管理
  const [calculationResult, setCalculationResult] = useState<CalculationResultData | null>(
    restoredData?.result ?? null,
  );

  // 計算結果セクションへのスクロール用ref
  const resultRef = useRef<HTMLDivElement>(null);
  const gasPriceRef = useRef<HTMLDivElement>(null);
  const fuelEfficiencyRef = useRef<HTMLDivElement>(null);
  const passengersRef = useRef<HTMLDivElement>(null);
  const discountTargetsRef = useRef<HTMLDivElement>(null);
  const routeSectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const otherExpensesRef = useRef<HTMLDivElement>(null);

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
    setRoutes((current) => [...current, ""]);
    setTollFees((current) => [...current, ""]);
    setOrigins((current) => [...current, ""]);
    setDestinations((current) => [...current, ""]);
    setRouteIntermediates((current) => [...current, []]);
    const routeId = `route-${nextRouteIdRef.current++}`;
    setRouteIds((current) => [...current, routeId]);
  };

  const addReturnRoute = (index: number, intermediates: string[]) => {
    setRoutes((current) => [...current, current[index] ?? ""]);
    setTollFees((current) => [...current, current[index] ?? ""]);
    setOrigins((current) => [...current, destinations[index] ?? ""]);
    setDestinations((current) => [...current, origins[index] ?? ""]);
    setRouteIntermediates((current) => [...current, intermediates]);
    const routeId = `route-${nextRouteIdRef.current++}`;
    setRouteIds((current) => [...current, routeId]);
  };

  // 経路を削除する処理
  const removeRoute = (index: number) => {
    if (routes.length > 1) {
      setRoutes((current) => current.filter((_, i) => i !== index));
      setTollFees((current) => current.filter((_, i) => i !== index));
      setOrigins((current) => current.filter((_, i) => i !== index));
      setDestinations((current) => current.filter((_, i) => i !== index));
      setRouteIntermediates((current) => current.filter((_, i) => i !== index));
      setRouteIds((current) => current.filter((_, i) => i !== index));
    }
  };

  // 経路の距離を更新する処理
  const updateRoute = (index: number, value: string) => {
    const newRoutes = [...routes];
    newRoutes[index] = value;
    setRoutes(newRoutes);
  };

  const updateOrigin = (index: number, value: string) => {
    const newOrigins = [...origins];
    newOrigins[index] = value;
    setOrigins(newOrigins);
  };

  const updateDestination = (index: number, value: string) => {
    const newDestinations = [...destinations];
    newDestinations[index] = value;
    setDestinations(newDestinations);
  };

  // 有料道路料金を更新する処理
  const updateTollFee = (index: number, value: string) => {
    const newTollFees = [...tollFees];
    newTollFees[index] = value;
    setTollFees(newTollFees);
  };

  // その他を追加する処理
  const addOther = () => {
    setOthers([...others, { name: "", amount: "" }]);
  };

  // その他を削除する処理
  const removeOther = (index: number) => {
    setOthers((current) => current.filter((_, i) => i !== index));
  };

  // その他を更新する処理
  const updateOther = (index: number, field: 'name' | 'amount', value: string) => {
    const newOthers = [...others];
    newOthers[index] = { ...newOthers[index], [field]: value };
    setOthers(newOthers);
  };

  const clearOther = (index: number) => {
    const newOthers = [...others];
    newOthers[index] = { name: "", amount: "" };
    setOthers(newOthers);
  };

  // GA4にイベントを送信する関数
  const sendGAEvent = (eventName: string, params?: Record<string, string | number>) => {
    window.gtag?.("event", eventName, params);
  };

  const shareCostSummary = calculationResult
    ? [
        `合計金額: ${calculationResult.totalCost.toLocaleString()}円`,
        ...(calculationResult.standardParticipantCount > 0
          ? [`割引非対象者: ${calculationResult.standardCostPerPerson.toLocaleString()}円`]
          : []),
        ...calculationResult.discountedParticipantCosts.map(
          (participant, index) =>
            `割引対象者${index + 1}${participant.discountApplied
              ? `（${participant.discountRate}%割引）`
              : "（1人のため割引なし）"}: ${participant.amount.toLocaleString()}円`,
        ),
      ].join("\n")
    : "合計金額: 0円";

  // 計算ボタンがクリックされた時の処理
  const handleCalculate = () => {
    sendGAEvent("calculate_button_click", {
      event_category: "engagement",
      event_label: "計算するボタン"
    });
    setLocationErrorsResetKey((current) => current + 1);

    const inputs: CalculatorInputs = {
      gasPrice,
      fuelEfficiency,
      passengers,
      discountRates,
      routes,
      tollFees,
      others,
    };
    const { errors: newErrors, result } = validateAndCalculate(inputs);

    if (!result) {
      setErrors(newErrors);
      requestAnimationFrame(() => {
        if (newErrors.gasPrice) {
          gasPriceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (newErrors.fuelEfficiency) {
          fuelEfficiencyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (newErrors.passengers) {
          passengersRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (newErrors.discountRates || newErrors.discountTargets) {
          discountTargetsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        for (let i = 0; i < routes.length; i++) {
          if (
            newErrors.tollFees?.[i] ||
            newErrors.routes?.[i]
          ) {
            routeSectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
        }
        // if (newErrors.others) {
        //   otherExpensesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        //   return;
        // }
      });
      return;
    }

    setErrors({});
    setCalculationResult(result);

    try {
      const encoded = encodeSharedData(inputs);
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
    setDiscountRates([""]);
    setRoutes([""]);
    setTollFees([""]);
    setOrigins([""]);
    setDestinations([""]);
    setRouteIds(["route-0"]);
    nextRouteIdRef.current = 1;
    setOthers(DEFAULT_OTHERS.map((other) => ({ ...other })));
    setErrors({});
    setLocationErrorsResetKey((current) => current + 1);
    setCalculationResult(null);
  };

  // LINEで共有する処理
  const handleLineShare = () => {
    // GA4にイベントを送信
    sendGAEvent("line_share_button_click", {
      event_category: "engagement",
      event_label: "LINEで共有するボタン"
    });

    try {
      const encoded = encodeSharedData({
        gasPrice, fuelEfficiency, passengers, discountRates, routes, tollFees, others,
      });
      const url = new URL(window.location.href);
      url.searchParams.set("data", encoded);

      const message = `交通費の計算結果\n${shareCostSummary}\n\n入力データと計算結果を開く:\n${url.toString()}`;
      const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(message)}`;
      window.open(lineUrl, "_blank");
    } catch (e) {
      console.error("Failed to share on LINE", e);
    }
  };
  // LINE Keepメモに一時保存する処理
  const handleLineKeepShare = () => {
    // GA4にイベントを送信
    sendGAEvent("line_keep_share_button_click", {
      event_category: "engagement",
      event_label: "LINE Keep メモ に一時保存するボタン"
    });

    try {
      const encoded = encodeSharedData({
        gasPrice, fuelEfficiency, passengers, discountRates, routes, tollFees, others,
      });
      const url = new URL(window.location.href);
      url.searchParams.set("data", encoded);

      // 自ページのパラメータにも値を渡す（反映する）
      window.history.replaceState({}, "", url.toString());

      const message = `【交通費の計算結果 (Keepメモ)】\n${shareCostSummary}\n\n入力データと計算結果を開く:\n${url.toString()}`;
      const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
      window.open(lineUrl, "_blank");
    } catch (e) {
      console.error("Failed to save to LINE Keep", e);
    }
  };




  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center justify-between py-8 px-4 sm:py-16 sm:px-8 bg-white dark:bg-zinc-900 shadow-lg">
        <div className="w-full">
          <h1 className="flex flex-col items-center justify-center gap-4 mb-16 text-center">
            <svg width="52" height="52" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" fill="#FFFFFF" />

              <circle cx="13.75" cy="11.75" r="2.3" fill="#38BDF8" />
              <circle cx="20" cy="11.75" r="2.3" fill="#38BDF8" />
              <circle cx="26.25" cy="11.75" r="2.3" fill="#38BDF8" />

              <circle cx="13.75" cy="17.75" r="2.3" fill="#E2E8F0" />
              <circle cx="20" cy="17.75" r="2.3" fill="#38BDF8" />
              <circle cx="26.25" cy="17.75" r="2.3" fill="#E2E8F0" />

              <circle cx="13.75" cy="23.75" r="2.3" fill="#E2E8F0" />
              <circle cx="20" cy="23.75" r="2.3" fill="#38BDF8" />
              <circle cx="26.25" cy="23.75" r="2.3" fill="#E2E8F0" />

              <circle cx="20" cy="29.75" r="2.3" fill="#38BDF8" />
            </svg>
            <span className="app-logo text-[#334155] dark:text-slate-100 font-bold text-[32px] tracking-[0.16em] leading-none mt-2">Tricoca</span>
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">旅費計算アプリ</span>
          </h1>

          {/* 入力フォーム */}
          <div className="space-y-6">
            {/* 経路 */}
            <div className="rounded-lg bg-gray-100 dark:bg-zinc-800">
              {routes.map((route, index) => (
                <Fragment key={routeIds[index]}>
                  <div ref={(el) => { routeSectionRefs.current[index] = el; }}>
                    <RouteSearchSection
                      routeNumber={index + 1}
                      distance={route}
                      tollFee={tollFees[index] ?? ""}
                      distanceError={errors.routes?.[index]}
                      tollFeeError={errors.tollFees?.[index]}
                      origin={origins[index] ?? ""}
                      destination={destinations[index] ?? ""}
                      initialIntermediates={routeIntermediates[index] ?? []}
                      originError={errors.origins?.[index]}
                      destinationError={errors.destinations?.[index]}
                      locationErrorsResetKey={locationErrorsResetKey}
                      onDistanceChange={(value) => updateRoute(index, value)}
                      onTollFeeChange={(value) => updateTollFee(index, value)}
                      onOriginChange={(value) => updateOrigin(index, value)}
                      onDestinationChange={(value) => updateDestination(index, value)}
                      onDistanceErrorClear={() => {
                        const routeErrors = [...(errors.routes ?? [])];
                        routeErrors[index] = undefined;
                        setErrors({ ...errors, routes: routeErrors });
                      }}
                      onTollFeeErrorClear={() => {
                        const tfErrors = [...(errors.tollFees ?? [])];
                        tfErrors[index] = undefined;
                        setErrors({ ...errors, tollFees: tfErrors });
                      }}
                      onOriginErrorClear={() => {
                        const orgErrors = [...(errors.origins ?? [])];
                        orgErrors[index] = undefined;
                        setErrors({ ...errors, origins: orgErrors });
                      }}
                      onDestinationErrorClear={() => {
                        const dstErrors = [...(errors.destinations ?? [])];
                        dstErrors[index] = undefined;
                        setErrors({ ...errors, destinations: dstErrors });
                      }}
                      onAddReturnRoute={
                        index === routes.length - 1
                          ? (intermediates) => addReturnRoute(index, intermediates)
                          : undefined
                      }
                      onAddRoute={index === routes.length - 1 ? addRoute : undefined}
                      onRemove={routes.length > 1 ? () => removeRoute(index) : undefined}
                    />
                  </div>
                  {index < routes.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="h-2 w-full text-white"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to right, currentColor 0 12px, transparent 12px 24px)",
                      }}
                    />
                  )}
                </Fragment>
              ))}
            </div>

            <VehicleSettings
              gasPrice={gasPrice}
              fuelEfficiency={fuelEfficiency}
              passengers={passengers}
              discountRates={discountRates}
              errors={errors}
              gasPriceRef={gasPriceRef}
              fuelEfficiencyRef={fuelEfficiencyRef}
              passengersRef={passengersRef}
              discountTargetsRef={discountTargetsRef}
              onGasPriceChange={(value) => {
                setGasPrice(value);
                if (errors.gasPrice) setErrors({ ...errors, gasPrice: undefined });
              }}
              onFuelEfficiencyChange={(value) => {
                setFuelEfficiency(value);
                if (errors.fuelEfficiency) setErrors({ ...errors, fuelEfficiency: undefined });
              }}
              onPassengersChange={(value) => {
                setPassengers(value);
                if (errors.passengers || errors.discountTargets) {
                  setErrors({
                    ...errors,
                    passengers: undefined,
                    discountTargets: undefined,
                  });
                }
              }}
              onDiscountRateChange={(index, value) => {
                setDiscountRates((current) => current.map(
                  (rate, rateIndex) => rateIndex === index ? value : rate,
                ));
                if (errors.discountRates?.[index] || errors.discountTargets) {
                  const rateErrors = [...(errors.discountRates ?? [])];
                  rateErrors[index] = undefined;
                  setErrors({
                    ...errors,
                    discountRates: rateErrors,
                    discountTargets: undefined,
                  });
                }
              }}
              onAddDiscountTarget={() => {
                setDiscountRates((current) => [...current, ""]);
                if (errors.discountTargets) {
                  setErrors({ ...errors, discountTargets: undefined });
                }
              }}
              onRemoveDiscountTarget={(index) => {
                setDiscountRates((current) => current.filter((_, rateIndex) => rateIndex !== index));
                if (errors.discountRates || errors.discountTargets) {
                  setErrors({
                    ...errors,
                    discountRates: errors.discountRates?.filter((_, rateIndex) => rateIndex !== index),
                    discountTargets: undefined,
                  });
                }
              }}
            />

            <div ref={otherExpensesRef}>
              <OtherExpenses
                others={others}
                onChange={updateOther}
                onClear={clearOther}
                onAdd={addOther}
                onRemove={removeOther}
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex flex-col gap-3 mt-8">
            <button
              onClick={handleLineKeepShare}
              className="w-full h-12 flex items-center justify-center gap-2 px-6 bg-[#06c755] text-white font-medium rounded-md hover:brightness-95 transition-[filter] border-0 focus:outline-none"
            >
              <LineLogoIcon />
              <strong>Keep メモ に一時保存する</strong>
            </button>

            <div className="flex gap-4 mt-3">
              <button
                onClick={handleCalculate}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors border-0 focus:outline-none"
              >
                計算する
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors border-0 focus:outline-none"
              >
                リセット
              </button>
            </div>
          </div>

          {/* 計算結果 */}
          {calculationResult && (
            <CalculationResult
              result={calculationResult}
              resultRef={resultRef}
              onLineShare={handleLineShare}
            />
          )}
        </div>
      </main>
    </div>
  );
}
