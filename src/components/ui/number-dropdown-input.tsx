"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type NumberDropdownInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  className?: string;
  error?: boolean;
  onBlur?: () => void;
  defaultValue?: string;
};

export function NumberDropdownInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  placeholder,
  className = "",
  error = false,
  onBlur,
  defaultValue,
}: NumberDropdownInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listId = `${generatedId}-options`;

  const items = useMemo(() => {
    const decimals = Math.max(
      ...[min, max, step].map((number) => (number.toString().split(".")[1] ?? "").length),
    );
    const factor = 10 ** decimals;
    const start = Math.round(min * factor);
    const end = Math.round(max * factor);
    const increment = Math.round(step * factor);
    const options: number[] = [];

    for (let current = start; current <= end; current += increment) {
      options.push(Number((current / factor).toFixed(decimals)));
    }

    return options;
  }, [min, max, step]);

  useEffect(() => {
    if (!isOpen || !listRef.current || items.length === 0) return;

    const currentValue = Number.parseFloat(value || defaultValue || "");
    const targetValue = Number.isNaN(currentValue) ? min : currentValue;
    const closestValue = items.reduce((closest, item) =>
      Math.abs(item - targetValue) < Math.abs(closest - targetValue) ? item : closest,
    );
    const option = listRef.current.querySelector<HTMLElement>(
      `[data-value="${closestValue}"]`,
    );
    if (option) {
      const containerHeight = listRef.current.clientHeight;
      const optionTop = option.offsetTop;
      const optionHeight = option.clientHeight;
      listRef.current.scrollTop = optionTop - containerHeight / 2 + optionHeight / 2;
    }
  }, [defaultValue, isOpen, items, min, value]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (containerRef.current?.contains(event.relatedTarget as Node | null)) return;

    setIsOpen(false);
    const rawValue = event.currentTarget.value;
    if (rawValue !== "") {
      const parsedValue = Number.parseFloat(rawValue);
      if (!Number.isNaN(parsedValue)) {
        const clampedValue = Math.max(min, Math.min(max, parsedValue));
        const snappedValue = min + Math.round((clampedValue - min) / step) * step;
        const decimals = Math.max(
          ...[min, max, step].map((number) => (number.toString().split(".")[1] ?? "").length),
        );
        onChange(Number(snappedValue.toFixed(decimals)).toString());
      }
    }

    onBlur?.();
  };

  const handleSelect = (item: number) => {
    onChange(item.toString());
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsOpen(false);
      }}
    >
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id ?? generatedId}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-invalid={error}
          className={`w-full rounded-md bg-white px-4 py-2 pr-16 text-gray-900 focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-white ${
            error ? "focus:ring-red-500 border border-red-500" : "focus:ring-blue-500"
          }`}
        />
        <div className="pointer-events-none absolute right-3 flex items-center gap-2 text-gray-500 dark:text-gray-400">
          {unit && <span className="text-sm">{unit}</span>}
          <ChevronDown
            className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {isOpen && (
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label="数値を選択"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="grid grid-cols-1 gap-1">
            {items.map((item) => {
              const isSelected = Number(value) === item && value !== "";

              return (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-value={item}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(item)}
                  className={`min-h-9 rounded-md px-2 text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-600 font-semibold text-white"
                      : "text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-gray-200 pt-2 text-center text-xs text-gray-500 dark:border-zinc-700 dark:text-gray-400">
            {min} 〜 {max}（{step}刻み）
          </p>
        </div>
      )}
    </div>
  );
}
