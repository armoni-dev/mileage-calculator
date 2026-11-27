"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_OTHERS,
  encodeSharedData,
  parseSharedData,
  validateAndCalculate,
  type CalculatorErrors,
  type CalculatorInputs,
  type CalculationResult,
  type OtherInput,
} from "@/lib/calculator";

type CalculatorFormErrors = CalculatorErrors & {
  origins?: (string | undefined)[];
  destinations?: (string | undefined)[];
};

export function useCalculator() {
  const searchParams = useSearchParams();
  const [restoredData] = useState(() =>
    parseSharedData(searchParams.get("data")),
  );

  const [gasPrice, setGasPrice] = useState(restoredData?.inputs.gasPrice ?? "");
  const [fuelEfficiency, setFuelEfficiency] = useState(
    restoredData?.inputs.fuelEfficiency ?? "",
  );
  const [passengers, setPassengers] = useState(
    restoredData?.inputs.passengers ?? "",
  );
  const [discountRates, setDiscountRates] = useState<string[]>(
    restoredData?.inputs.discountRates ?? [""],
  );
  const [routes, setRoutes] = useState<string[]>(
    restoredData?.inputs.routes ?? [""],
  );
  const [tollFees, setTollFees] = useState<string[]>(
    restoredData?.inputs.tollFees ?? [""],
  );
  const [origins, setOrigins] = useState<string[]>(
    restoredData?.inputs.origins ?? [""],
  );
  const [destinations, setDestinations] = useState<string[]>(
    restoredData?.inputs.destinations ?? [""],
  );
  const [routeIntermediates, setRouteIntermediates] = useState<string[][]>(() =>
    restoredData?.inputs.routeIntermediates ?? (restoredData?.inputs.routes ?? [""]).map(() => []),
  );
  const [routeIds, setRouteIds] = useState(() =>
    (restoredData?.inputs.routes ?? [""]).map((_, index) => `route-${index}`),
  );
  const nextRouteIdRef = useRef(routeIds.length);
  const [others, setOthers] = useState<OtherInput[]>(
    restoredData?.inputs.others ?? DEFAULT_OTHERS.map((other) => ({ ...other })),
  );
  const [errors, setErrors] = useState<CalculatorFormErrors>({});
  const [locationErrorsResetKey, setLocationErrorsResetKey] = useState(0);
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(restoredData?.result ?? null);

  const resultRef = useRef<HTMLDivElement>(null);
  const gasPriceRef = useRef<HTMLDivElement>(null);
  const fuelEfficiencyRef = useRef<HTMLDivElement>(null);
  const passengersRef = useRef<HTMLDivElement>(null);
  const discountTargetsRef = useRef<HTMLDivElement>(null);
  const routeSectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const otherExpensesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!restoredData?.result) return;

    const timeoutId = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [restoredData]);

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

  const updateTollFee = (index: number, value: string) => {
    const newTollFees = [...tollFees];
    newTollFees[index] = value;
    setTollFees(newTollFees);
  };

  const addOther = () => {
    setOthers([...others, { name: "", amount: "" }]);
  };

  const removeOther = (index: number) => {
    setOthers((current) => current.filter((_, i) => i !== index));
  };

  const updateOther = (
    index: number,
    field: "name" | "amount",
    value: string,
  ) => {
    const newOthers = [...others];
    newOthers[index] = { ...newOthers[index], [field]: value };
    setOthers(newOthers);
  };

  const clearOther = (index: number) => {
    const newOthers = [...others];
    newOthers[index] = { name: "", amount: "" };
    setOthers(newOthers);
  };

  const sendGAEvent = (
    eventName: string,
    params?: Record<string, string | number>,
  ) => {
    window.gtag?.("event", eventName, params);
  };

  const shareCostSummary = calculationResult
    ? [
        `合計金額: ${calculationResult.totalCost.toLocaleString()}円`,
        ...(calculationResult.standardParticipantCount > 0
          ? [
              `割引対象者以外: ${calculationResult.standardCostPerPersonCeil.toLocaleString()}円`,
            ]
          : []),
        ...calculationResult.discountedParticipantCosts.map(
          (participant, index) =>
            `割引対象者${index + 1}${
              participant.discountApplied
                ? `（${participant.discountRate}%割引）`
                : "（1人のため割引なし）"
            }: ${participant.amountCeil.toLocaleString()}円`,
        ),
      ].join("\n")
    : "合計金額: 0円";

  const handleCalculate = () => {
    sendGAEvent("calculate_button_click", {
      event_category: "engagement",
      event_label: "計算するボタン",
    });
    setLocationErrorsResetKey((current) => current + 1);

    const inputs: CalculatorInputs = {
      gasPrice,
      fuelEfficiency,
      passengers,
      discountRates,
      routes,
      tollFees,
      origins,
      destinations,
      routeIntermediates,
      others,
    };
    const { errors: newErrors, result } = validateAndCalculate(inputs);

    if (!result) {
      setErrors(newErrors);
      requestAnimationFrame(() => {
        if (newErrors.gasPrice) {
          gasPriceRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }
        if (newErrors.fuelEfficiency) {
          fuelEfficiencyRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }
        if (newErrors.passengers) {
          passengersRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }
        if (newErrors.discountRates || newErrors.discountTargets) {
          discountTargetsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }
        for (let i = 0; i < routes.length; i++) {
          if (newErrors.tollFees?.[i] || newErrors.routes?.[i]) {
            routeSectionRefs.current[i]?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            return;
          }
        }
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
    } catch (error) {
      console.error("Failed to save URL params", error);
    }

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleReset = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("data");
      window.history.replaceState({}, "", url.toString());
    } catch (error) {
      console.error("Failed to clear URL params", error);
    }
    setGasPrice("");
    setFuelEfficiency("");
    setPassengers("");
    setDiscountRates([""]);
    setRoutes([""]);
    setTollFees([""]);
    setOrigins([""]);
    setDestinations([""]);
    setRouteIntermediates([[]]);
    setRouteIds(["route-0"]);
    nextRouteIdRef.current = 1;
    setOthers(DEFAULT_OTHERS.map((other) => ({ ...other })));
    setErrors({});
    setLocationErrorsResetKey((current) => current + 1);
    setCalculationResult(null);
  };

  const handleLineShare = () => {
    sendGAEvent("line_share_button_click", {
      event_category: "engagement",
      event_label: "LINEで共有するボタン",
    });

    try {
      const encoded = encodeSharedData({
        gasPrice,
        fuelEfficiency,
        passengers,
        discountRates,
        routes,
        tollFees,
        origins,
        destinations,
        routeIntermediates,
        others,
      });
      const url = new URL(window.location.href);
      url.searchParams.set("data", encoded);

      const message = `交通費の計算結果\n${shareCostSummary}\n\n入力データと計算結果を開く:\n${url.toString()}`;
      const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(message)}`;
      window.open(lineUrl, "_blank");
    } catch (error) {
      console.error("Failed to share on LINE", error);
    }
  };

  const handleLineKeepShare = () => {
    sendGAEvent("line_keep_share_button_click", {
      event_category: "engagement",
      event_label: "LINE Keep メモ に一時保存するボタン",
    });

    try {
      const encoded = encodeSharedData({
        gasPrice,
        fuelEfficiency,
        passengers,
        discountRates,
        routes,
        tollFees,
        origins,
        destinations,
        routeIntermediates,
        others,
      });
      const url = new URL(window.location.href);
      url.searchParams.set("data", encoded);

      window.history.replaceState({}, "", url.toString());

      const message = `【交通費の計算結果 (Keepメモ)】\n${shareCostSummary}\n\n入力データと計算結果を開く:\n${url.toString()}`;
      const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
      window.open(lineUrl, "_blank");
    } catch (error) {
      console.error("Failed to save to LINE Keep", error);
    }
  };

  return {
    gasPrice,
    fuelEfficiency,
    passengers,
    discountRates,
    routes,
    tollFees,
    origins,
    destinations,
    routeIntermediates,
    routeIds,
    others,
    errors,
    locationErrorsResetKey,
    calculationResult,
    resultRef,
    gasPriceRef,
    fuelEfficiencyRef,
    passengersRef,
    discountTargetsRef,
    routeSectionRefs,
    otherExpensesRef,
    addRoute,
    addReturnRoute,
    removeRoute,
    updateRoute,
    updateOrigin,
    updateDestination,
    updateTollFee,
    addOther,
    removeOther,
    updateOther,
    clearOther,
    handleCalculate,
    handleReset,
    handleLineShare,
    handleLineKeepShare,
    setGasPrice,
    setFuelEfficiency,
    setPassengers,
    setDiscountRates,
    setErrors,
  };
}
