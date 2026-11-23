export type OtherInput = { name: string; amount: string };
export type CalculatedOther = { name: string; amount: number };
export type CalculatorInputs = {
  gasPrice: string;
  fuelEfficiency: string;
  passengers: string;
  discountRates: string[];
  routes: string[];
  tollFees: string[];
  others: OtherInput[];
};

export type RouteDetail = {
  distance: number;
  tollFee: number;
};

export type CalculationResult = {
  totalDistance: number;
  fuelPerKm: number;
  fuelCost: number;
  totalTollFee: number;
  totalOthersFee: number;
  calculatedOthers: CalculatedOther[];
  totalCost: number;
  passengerCount: number;
  standardParticipantCount: number;
  standardCostPerPerson: number;
  discountedParticipantCosts: {
    discountRate: number;
    amount: number;
    discountApplied: boolean;
  }[];
  routeDetails: RouteDetail[];
};

export type CalculatorErrors = {
  gasPrice?: string;
  fuelEfficiency?: string;
  passengers?: string;
  discountRates?: (string | undefined)[];
  discountTargets?: string;
  routes?: (string | undefined)[];
  tollFees?: (string | undefined)[];
};

export type RestoredData = {
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

export const DEFAULT_OTHERS: OtherInput[] = [
  { name: "駐車料金", amount: "" },
  { name: "", amount: "" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptionalNumber(value: string): number {
  if (value === "") return 0;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function createEmptyCalculatorInputs(): CalculatorInputs {
  return {
    gasPrice: "",
    fuelEfficiency: "",
    passengers: "",
    discountRates: [""],
    routes: [""],
    tollFees: [""],
    others: DEFAULT_OTHERS.map((other) => ({ ...other })),
  };
}

export function validateAndCalculate(inputs: CalculatorInputs): {
  errors: CalculatorErrors;
  result: CalculationResult | null;
} {
  const errors: CalculatorErrors = {};
  let hasError = false;

  const gasPrice = Number.parseFloat(inputs.gasPrice);
  if (inputs.gasPrice === "" || Number.isNaN(gasPrice)) {
    errors.gasPrice = "ガソリン価格を入力してください";
    hasError = true;
  } else if (gasPrice <= 0) {
    errors.gasPrice = "ガソリン価格は正の数を入力してください";
    hasError = true;
  }

  const fuelEfficiency = Number.parseFloat(inputs.fuelEfficiency);
  if (inputs.fuelEfficiency === "" || Number.isNaN(fuelEfficiency)) {
    errors.fuelEfficiency = "燃費を入力してください";
    hasError = true;
  } else if (fuelEfficiency <= 0) {
    errors.fuelEfficiency = "燃費は正の数を入力してください";
    hasError = true;
  }

  const passengers = Number.parseInt(inputs.passengers, 10);
  if (inputs.passengers === "" || Number.isNaN(passengers)) {
    errors.passengers = "乗車人数を入力してください";
    hasError = true;
  } else if (passengers < 1) {
    errors.passengers = "乗車人数は1人以上にしてください";
    hasError = true;
  }

  const discountRates = inputs.discountRates.map((value) => (
    value === "" ? 0 : Number.parseFloat(value)
  ));
  const discountRateErrors: (string | undefined)[] = inputs.discountRates.map((value) => {
    if (value === "" || value.trim() === "") {
      hasError = true;
      return "割引率を入力してください";
    }
    const rate = Number.parseFloat(value);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      hasError = true;
      return "割引率は0〜100％で入力してください";
    }
    return undefined;
  });
  if (discountRateErrors.length > 0) errors.discountRates = discountRateErrors;
  if (Number.isFinite(passengers) && discountRates.length > passengers) {
    errors.discountTargets = "割引対象者の数は支払対象人数を超えられません。";
    hasError = true;
  }
  const shareFactor = passengers === 1
    ? 1
    : passengers - discountRates.reduce((sum, rate) => sum + rate / 100, 0);
  if (Number.isFinite(passengers) && shareFactor <= 0) {
    errors.discountTargets = "全員を100％割引にすると合計費用を分担できません。";
    hasError = true;
  }

  const tollFeeErrors: (string | undefined)[] = [];
  const tollFees = inputs.tollFees.map((value) => {
    const parsed = Number.parseFloat(value.replace(/,/g, ""));
    return value === "" || Number.isNaN(parsed) ? 0 : parsed;
  });
  for (let index = 0; index < inputs.tollFees.length; index++) {
    const value = inputs.tollFees[index] ?? "";
    const parsed = Number.parseFloat(value.replace(/,/g, ""));
    if (value === "" || Number.isNaN(parsed)) {
      tollFeeErrors[index] = "有料道路料金を入力してください";
      hasError = true;
    } else if (parsed < 0) {
      tollFeeErrors[index] = "0以上の数を入力してください";
      hasError = true;
    }
  }
  if (tollFeeErrors.length > 0) errors.tollFees = tollFeeErrors;

  const routeErrors: (string | undefined)[] = [];
  const routeDetails: RouteDetail[] = inputs.routes.map((value, index) => {
    const distance = Number.parseFloat(value.replace(/,/g, ""));
    if (value === "" || Number.isNaN(distance)) {
      routeErrors[index] = "走行距離を入力してください";
      hasError = true;
    } else if (distance < 0) {
      routeErrors[index] = "0以上の数を入力してください";
      hasError = true;
    }
    return {
      distance: Number.isNaN(distance) ? 0 : distance,
      tollFee: tollFees[index] ?? 0,
    };
  });
  if (routeErrors.length > 0) errors.routes = routeErrors;

  if (hasError) return { errors, result: null };

  const totalDistance = routeDetails.reduce((total, route) => total + route.distance, 0);
  const totalTollFee = routeDetails.reduce((total, route) => total + route.tollFee, 0);
  const calculatedOthers = inputs.others.flatMap((other, index) => {
    const amount = parseOptionalNumber(other.amount);
    return amount > 0 || other.name !== ""
      ? [{ name: other.name || `その他 ${index + 1}`, amount }]
      : [];
  });
  const totalOthersFee = inputs.others.reduce(
    (total, other) => total + parseOptionalNumber(other.amount),
    0,
  );
  const fuelCost = (totalDistance / fuelEfficiency) * gasPrice;
  const totalCost = fuelCost + totalTollFee + totalOthersFee;
  const standardCostPerPerson = totalCost / shareFactor;
  const discountedParticipantCosts = discountRates.map((discountRate) => ({
    discountRate,
    amount: passengers === 1
      ? totalCost
      : standardCostPerPerson * (1 - discountRate / 100),
    discountApplied: passengers > 1,
  }));

  return {
    errors,
    result: {
      totalDistance: Math.round(totalDistance * 10) / 10,
      fuelPerKm: Math.round((gasPrice / fuelEfficiency) * 10) / 10,
      fuelCost: Math.round(fuelCost * 10) / 10,
      totalTollFee,
      totalOthersFee,
      calculatedOthers,
      totalCost: Math.round(totalCost * 10) / 10,
      passengerCount: passengers,
      standardParticipantCount: passengers - discountRates.length,
      standardCostPerPerson: Math.round(standardCostPerPerson * 10) / 10,
      discountedParticipantCosts: discountedParticipantCosts.map((participant) => ({
        ...participant,
        amount: Math.round(participant.amount * 10) / 10,
      })),
      routeDetails,
    },
  };
}

export function parseSharedData(data: string | null): RestoredData | null {
  if (!data) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(data)));
    if (!isRecord(parsed)) throw new TypeError("Shared calculator data must be an object");

    const getString = (key: string): string => {
      const value = parsed[key];
      if (value === undefined) return "";
      if (typeof value !== "string") throw new TypeError(`Shared calculator field "${key}" must be a string`);
      return value;
    };
    const getStringArray = (key: string): string[] => {
      const value = parsed[key];
      if (value === undefined || (Array.isArray(value) && value.length === 0)) return [""];
      if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        throw new TypeError(`Shared calculator field "${key}" must be an array of strings`);
      }
      return value;
    };

    let others = DEFAULT_OTHERS.map((other) => ({ ...other }));
    const othersValue = parsed.others;
    if (Array.isArray(othersValue) && othersValue.length > 0) {
      if (!othersValue.every(
        (item) => isRecord(item) && typeof item.name === "string" && typeof item.amount === "string",
      )) {
        throw new TypeError('Shared calculator field "others" must contain name and amount strings');
      }
      others = othersValue as OtherInput[];
      if (others.length === 1) others = [others[0], { name: "", amount: "" }];
    }

    const routes = getStringArray("routes");
    const tollFees = getStringArray("tollFees");
    let discountRates = [""];
    if (parsed.discountRates !== undefined) {
      if (!Array.isArray(parsed.discountRates) || !parsed.discountRates.every((rate) => typeof rate === "string")) {
        throw new TypeError('Shared calculator field "discountRates" must be an array of strings');
      }
      discountRates = parsed.discountRates;
    } else if (parsed.driverDiscount !== undefined) {
      const legacyDiscount = getString("driverDiscount");
      discountRates = [legacyDiscount];
    }
    const routeCount = Math.max(routes.length, tollFees.length);
    const inputs: CalculatorInputs = {
      gasPrice: getString("gasPrice"),
      fuelEfficiency: getString("fuelEfficiency"),
      passengers: getString("passengers"),
      discountRates,
      routes: [...routes, ...Array(Math.max(0, routeCount - routes.length)).fill("")],
      tollFees: [...tollFees, ...Array(Math.max(0, routeCount - tollFees.length)).fill("")],
      others,
    };
    return { inputs, result: validateAndCalculate(inputs).result };
  } catch (error) {
    console.error("Failed to parse URL params", error);
    return null;
  }
}

export function encodeSharedData(inputs: CalculatorInputs): string {
  const encoded = btoa(encodeURIComponent(JSON.stringify(inputs)));
  return encoded;
}
