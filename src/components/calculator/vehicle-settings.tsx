import type { RefObject } from "react";
import { Eraser, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberDropdownInput } from "@/components/ui/number-dropdown-input";
import type { CalculatorErrors } from "@/lib/calculator";

type Props = {
  gasPrice: string;
  fuelEfficiency: string;
  passengers: string;
  discountRates: string[];
  errors: CalculatorErrors;
  gasPriceRef: RefObject<HTMLDivElement | null>;
  fuelEfficiencyRef: RefObject<HTMLDivElement | null>;
  passengersRef: RefObject<HTMLDivElement | null>;
  discountTargetsRef: RefObject<HTMLDivElement | null>;
  onGasPriceChange: (value: string) => void;
  onFuelEfficiencyChange: (value: string) => void;
  onPassengersChange: (value: string) => void;
  onDiscountRateChange: (index: number, value: string) => void;
  onAddDiscountTarget: () => void;
  onRemoveDiscountTarget: (index: number) => void;
};

export default function VehicleSettings({
  gasPrice,
  fuelEfficiency,
  passengers,
  discountRates,
  errors,
  gasPriceRef,
  fuelEfficiencyRef,
  passengersRef,
  discountTargetsRef,
  onGasPriceChange,
  onFuelEfficiencyChange,
  onPassengersChange,
  onDiscountRateChange,
  onAddDiscountTarget,
  onRemoveDiscountTarget,
}: Props) {
  return (
    <div className="px-4 py-8 bg-gray-100 dark:bg-zinc-800 rounded-lg space-y-4 mb-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2 mb-8">
        車両・精算条件設定
      </h2>

      <div ref={gasPriceRef}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          ガソリン価格（1Lあたり）
        </label>
        <NumberDropdownInput
          id="gas-price"
          value={gasPrice}
          onChange={onGasPriceChange}
          min={50}
          max={250}
          step={1}
          unit="円"
          placeholder="例: 150"
          defaultValue="150"
          error={Boolean(errors.gasPrice)}
        />
        {errors.gasPrice && <p className="mt-2 text-sm text-red-500">{errors.gasPrice}</p>}
      </div>

      <div ref={fuelEfficiencyRef}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          車の燃費（1Lあたり）
        </label>
        <NumberDropdownInput
          id="fuel-efficiency"
          value={fuelEfficiency}
          onChange={onFuelEfficiencyChange}
          min={1}
          max={30}
          step={1}
          unit="km/L"
          placeholder="例: 15"
          defaultValue="15"
          error={Boolean(errors.fuelEfficiency)}
        />
        {errors.fuelEfficiency && <p className="mt-2 text-sm text-red-500">{errors.fuelEfficiency}</p>}
      </div>

      <div ref={passengersRef}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          乗車人数（支払対象人数）
        </label>
        <NumberDropdownInput
          id="passengers"
          value={passengers}
          onChange={onPassengersChange}
          min={1}
          max={10}
          step={1}
          unit="人"
          placeholder="例: 3"
          defaultValue="3"
          error={Boolean(errors.passengers)}
        />
        {errors.passengers && <p className="mt-2 text-sm text-red-500">{errors.passengers}</p>}
      </div>

      <div ref={discountTargetsRef} className="space-y-3">
        {discountRates.map((discountRate, index) => (
          <div key={index}>
            <label
              htmlFor={`discount-rate-${index}`}
              onClick={(event) => event.preventDefault()}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              割引対象者 {index + 1} の割引率{index === 0 ? "（運転者など）" : ""}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                  <NumberDropdownInput
                    id={`discount-rate-${index}`}
                    value={discountRate}
                    onChange={(value) => onDiscountRateChange(index, value)}
                    min={0}
                    max={100}
                    step={1}
                    unit="% 引き"
                    placeholder="例: 10"
                    defaultValue="10"
                    error={Boolean(errors.discountRates?.[index])}
                  />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (discountRate !== "") {
                    onDiscountRateChange(index, "");
                  } else {
                    onRemoveDiscountTarget(index);
                  }
                }}
                className="h-10 w-10 bg-white text-red-500 hover:bg-white hover:text-red-700 dark:bg-white dark:hover:bg-white"
                aria-label={
                  discountRate !== ""
                    ? `割引対象者 ${index + 1} をクリア`
                    : `割引対象者 ${index + 1} を削除`
                }
              >
                {discountRate !== "" ? (
                  <Eraser className="h-4 w-4 text-[var(--color-blue-600)]" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.discountRates?.[index] && (
              <p className="mt-2 text-sm text-red-500">{errors.discountRates[index]}</p>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onAddDiscountTarget}
          className="mt-4 h-10 w-full rounded-md border-dashed border-gray-300 bg-gray-100 text-sm font-semibold text-gray-500 hover:bg-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        >
          <Plus className="size-4" />
          割引対象者を追加
        </Button>
        {errors.discountTargets && <p className="mt-2 text-sm text-red-500">{errors.discountTargets}</p>}
      </div>
    </div>
  );
}

