"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchPlacePredictions,
  geocodeAddress,
  type MapPoint,
  type PlaceAutocompletePrediction,
} from "./google-maps-api";

type Props = {
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

export default function PlaceAutocompleteInput({
  value,
  onChange,
  onLocationResolved,
  placeholder,
  clearLabel,
  emptyAction,
  className,
  apiKey,
  onActivate,
}: Props) {
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      if (point && requestId === predictionRequestRef.current) {
        onLocationResolved?.(point);
      }
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
            className="h-10 w-10 border-0 bg-white text-red-500 hover:bg-white hover:text-red-700 dark:bg-white dark:hover:bg-white"
            aria-label={value !== "" ? clearLabel : emptyAction?.label}
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
              onClick={() => handleSelectPrediction(prediction.description)}
              className="cursor-pointer border-b border-gray-100 px-4 py-2 text-gray-800 last:border-none first:rounded-t-md last:rounded-b-md hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-zinc-700"
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
