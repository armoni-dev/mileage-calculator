"use client";

import { Fragment } from "react";
import RouteSearchSection from "./route-search/route-search-section";
import VehicleSettings from "@/components/calculator/vehicle-settings";
import OtherExpenses from "@/components/calculator/other-expenses";
import CalculationResult from "@/components/calculator/calculation-result";
import LineLogoIcon from "@/components/calculator/line-logo";
import { useCalculator } from "./hooks/use-calculator";

export default function Calculator() {
  const {
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
  } = useCalculator();

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
