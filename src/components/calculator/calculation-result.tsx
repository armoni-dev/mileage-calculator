import type { RefObject } from "react";
import type { CalculationResult } from "@/lib/calculator";
import LineLogoIcon from "./line-logo";

type Props = {
  result: CalculationResult;
  resultRef: RefObject<HTMLDivElement | null>;
  onLineShare: () => void;
};

export default function CalculationResult({ result, resultRef, onLineShare }: Props) {
  const hasStandardParticipants = result.standardParticipantCount > 0;

  return (
    <div id="calculation-result-section" ref={resultRef} className="mt-8 space-y-6">
      <div className="p-6 bg-[#38BDF8] rounded-2xl shadow-lg text-white">
        <div className="text-center mb-4">
          <span className="text-sm font-semibold tracking-wider uppercase bg-white text-[#38BDF8] px-3 py-1 rounded-full inline-block">
            1人あたりの支払額
          </span>
        </div>
        <div className="space-y-3 max-w-md mx-auto">
          {hasStandardParticipants && (
            <div className="flex justify-between items-center bg-white/20 px-4 py-3 rounded-xl">
              <span className="text-lg sm:text-xl font-bold">割引対象者以外</span>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {result.standardCostPerPersonCeil.toLocaleString()}
                <span className="text-xl sm:text-2xl font-bold ml-1">円</span>
              </span>
            </div>
          )}
          {result.discountedParticipantCosts.map((participant, index) => (
            <div key={index} className="flex justify-between items-center bg-white/10 px-4 py-2.5 rounded-xl">
              <span className="text-xs sm:text-sm font-medium opacity-90">
                割引対象者 {index + 1}（{participant.discountApplied ? `${participant.discountRate}%割引` : "1人のため割引なし"}）
              </span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                {participant.amountCeil.toLocaleString()}
                <span className="text-base font-semibold ml-1">円</span>
              </span>
            </div>
          ))}
          {!hasStandardParticipants && result.discountedParticipantCosts.length === 0 && (
            <div className="text-center py-2">
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                {result.standardCostPerPersonCeil.toLocaleString()}
                <span className="text-2xl sm:text-3xl font-bold ml-1">円</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-8 bg-sky-100 dark:bg-sky-900/40 rounded-xl">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2 mb-8">
          計算結果・詳細内訳
        </h2>
        <div className="space-y-3">
          {result.routeDetails.length > 0 && (
            <div className="pt-3 pb-2 space-y-2">
              <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                走行経路ごとの内訳
              </span>
              {result.routeDetails.map((route, index) => (
                <div key={index} className="flex justify-between items-center text-sm bg-white/60 dark:bg-zinc-900/60 px-3 py-2 rounded-md">
                  <span className="font-medium text-gray-800 dark:text-gray-200">走行経路 {index + 1}</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    距離: <strong className="text-gray-900 dark:text-white">{route.distance} km</strong>
                    {" / "}
                    有料道路: <strong className="text-gray-900 dark:text-white">{route.tollFee.toLocaleString()} 円</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between pt-3">
            <span className="text-gray-700 dark:text-gray-300">総走行距離</span>
            <span className="font-semibold text-gray-900 dark:text-white">{result.totalDistance} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700 dark:text-gray-300">1kmあたりの燃料費</span>
            <span className="font-semibold text-gray-900 dark:text-white">{result.fuelPerKm} 円/km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700 dark:text-gray-300">総燃料費</span>
            <span className="font-semibold text-gray-900 dark:text-white">{result.fuelCost.toLocaleString()} 円</span>
          </div>
          {result.discountedParticipantCosts.map((participant, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">
                割引対象者 {index + 1} の負担額（
                {participant.discountApplied ? `${participant.discountRate}%割引` : "1人のため割引なし"}）
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {participant.amount.toLocaleString()} 円
              </span>
            </div>
          ))}
          {hasStandardParticipants && (
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">
                割引対象外1人あたりの負担額（{result.standardParticipantCount}人）
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {result.standardCostPerPerson.toLocaleString()} 円
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-700 dark:text-gray-300">有料道路料金 (合計)</span>
            <span className="font-semibold text-gray-900 dark:text-white">{result.totalTollFee.toLocaleString()} 円</span>
          </div>
          {result.calculatedOthers.map((item, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{item.amount.toLocaleString()} 円</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 text-base">
            <span className="font-semibold text-gray-800 dark:text-gray-200">合計金額</span>
            <span className="font-bold text-blue-700 dark:text-blue-400 text-lg">{result.totalCost.toLocaleString()} 円</span>
          </div>
          <div className="pt-4 mt-4">
            <button
              onClick={onLineShare}
              className="w-full h-12 flex items-center justify-center gap-2 px-6 bg-[#06c755] text-white font-medium rounded-md hover:brightness-95 transition-[filter] border-0 focus:outline-none"
            >
              <LineLogoIcon />
              <strong>結果を共有する</strong>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

