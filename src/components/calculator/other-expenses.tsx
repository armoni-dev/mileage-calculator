import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Eraser, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OtherInput } from "@/lib/calculator";

type AutoFitTextareaProps = ComponentProps<"textarea"> & {
  measureWrapper?: boolean;
  sharedHeight: number;
  lineCount: number;
  onMeasureHeight: (height: number, lineCount: number) => void;
};

function AutoFitTextarea({
  lineCount,
  measureWrapper = false,
  onMeasureHeight,
  sharedHeight,
  style,
  ...props
}: AutoFitTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState<number>();
  const value = String(props.value ?? "");

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const context = document.createElement("canvas").getContext("2d");
    if (!context) return;

    const update = () => {
      const inputStyle = window.getComputedStyle(textarea);
      const inheritedFontSize = Number.parseFloat(
        window.getComputedStyle(textarea.parentElement ?? textarea).fontSize,
      );
      const baseFontSize = Number.isFinite(inheritedFontSize) ? inheritedFontSize : 16;
      const availableWidth =
        textarea.clientWidth -
        Number.parseFloat(inputStyle.paddingLeft) -
        Number.parseFloat(inputStyle.paddingRight);

      context.font = `${inputStyle.fontWeight} ${baseFontSize}px ${inputStyle.fontFamily}`;
      const textWidth = value.split("\n").reduce(
        (maximum, line) => Math.max(maximum, context.measureText(line).width),
        0,
      );
      const nextFontSize =
        value && textWidth > availableWidth
          ? Math.max(10, baseFontSize * (availableWidth / textWidth))
          : undefined;
      const effectiveFontSize = nextFontSize ?? baseFontSize;

      const currentHeight = textarea.style.height;
      const currentMinHeight = textarea.style.minHeight;
      const currentLineHeight = textarea.style.lineHeight;
      const currentFontSize = textarea.style.fontSize;
      const currentAlignSelf = textarea.style.alignSelf;
      const wrapper = measureWrapper ? textarea.parentElement : null;
      const currentWrapperHeight = wrapper?.style.height ?? "";
      const currentWrapperAlignSelf = wrapper?.style.alignSelf ?? "";
      textarea.style.height = "auto";
      textarea.style.minHeight = "0";
      textarea.style.lineHeight = "1.5";
      textarea.style.fontSize = `${effectiveFontSize}px`;
      textarea.style.alignSelf = "start";
      if (wrapper) {
        wrapper.style.height = "auto";
        wrapper.style.alignSelf = "start";
      }

      const measurementStyle = window.getComputedStyle(textarea);
      const verticalPadding =
        Number.parseFloat(measurementStyle.paddingTop) +
        Number.parseFloat(measurementStyle.paddingBottom);
      const borderHeight =
        Number.parseFloat(measurementStyle.borderTopWidth) +
        Number.parseFloat(measurementStyle.borderBottomWidth);
      const naturalLineHeight = Number.parseFloat(measurementStyle.lineHeight);
      const measuredScrollHeight = textarea.scrollHeight;
      const lineCount = Math.max(
        1,
        Math.round((measuredScrollHeight - verticalPadding) / naturalLineHeight),
      );
      const height =
        lineCount === 1
          ? 40
          : Math.ceil(measuredScrollHeight + borderHeight);

      textarea.style.minHeight = currentMinHeight;
      textarea.style.lineHeight = currentLineHeight;
      textarea.style.fontSize = currentFontSize;
      textarea.style.alignSelf = currentAlignSelf;
      textarea.style.height = currentHeight || "40px";
      if (wrapper) {
        wrapper.style.height = currentWrapperHeight;
        wrapper.style.alignSelf = currentWrapperAlignSelf;
      }

      setFontSize((current) =>
        current === nextFontSize ? current : nextFontSize,
      );
      onMeasureHeight(height, lineCount);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [fontSize, measureWrapper, onMeasureHeight, value]);

  const lineHeight = Math.max(10, (sharedHeight - 18) / lineCount);
  return (
    <textarea
      {...props}
      rows={1}
      ref={textareaRef}
      style={{
        ...style,
        height: `${sharedHeight}px`,
        lineHeight: `${lineHeight}px`,
        ...(fontSize === undefined ? {} : { fontSize: `${fontSize}px` }),
      }}
    />
  );
}

function toHalfWidth(str: string): string {
  return str
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/．/g, ".")
    .replace(/ー/g, "-");
}

type Props = {
  others: OtherInput[];
  onChange: (index: number, field: "name" | "amount", value: string) => void;
  onClear: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

type OtherExpenseRowProps = {
  other: OtherInput;
  index: number;
  onChange: Props["onChange"];
  onClear: Props["onClear"];
  onRemove: Props["onRemove"];
};

function OtherExpenseRow({
  other,
  index,
  onChange,
  onClear,
  onRemove,
}: OtherExpenseRowProps) {
  const [fieldMeasurements, setFieldMeasurements] = useState({
    name: { height: 40, lineCount: 1 },
    amount: { height: 40, lineCount: 1 },
  });
  const onMeasureNameHeight = useCallback((height: number, lineCount: number) => {
    setFieldMeasurements((current) =>
      current.name.height === height && current.name.lineCount === lineCount
        ? current
        : { ...current, name: { height, lineCount } },
    );
  }, []);
  const onMeasureAmountHeight = useCallback((height: number, lineCount: number) => {
    setFieldMeasurements((current) =>
      current.amount.height === height && current.amount.lineCount === lineCount
        ? current
        : { ...current, amount: { height, lineCount } },
    );
  }, []);
  const sharedHeight = Math.max(
    fieldMeasurements.name.height,
    fieldMeasurements.amount.height,
  );

  return (
    <div className="grid grid-cols-1 gap-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        項目 {index + 1}
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-stretch gap-2">
        <AutoFitTextarea
          value={other.name}
          onChange={(event) => onChange(index, "name", event.target.value)}
          placeholder="例: 駐車料金"
          sharedHeight={sharedHeight}
          lineCount={fieldMeasurements.name.lineCount}
          onMeasureHeight={onMeasureNameHeight}
          className="block h-auto min-h-10 w-full min-w-0 resize-none overflow-hidden whitespace-pre-wrap break-all rounded-md bg-white px-4 py-2 leading-normal focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900 dark:text-white"
        />
        <div className="relative h-full min-w-0">
          <AutoFitTextarea
            inputMode="numeric"
            measureWrapper
            value={other.amount}
            onChange={(event) => {
              const converted = toHalfWidth(event.target.value).replace(/[\r\n]/g, "");
              onChange(index, "amount", converted);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            onBlur={(event) => {
              const val = toHalfWidth(event.target.value).replace(/,/g, "");
              if (val !== "") {
                const num = Number.parseInt(val, 10);
                if (!Number.isNaN(num)) {
                  onChange(index, "amount", num.toLocaleString());
                }
              }
            }}
            placeholder="例: 1,000"
            sharedHeight={sharedHeight}
            lineCount={fieldMeasurements.amount.lineCount}
            onMeasureHeight={onMeasureAmountHeight}
            className="block h-full min-h-10 w-full resize-none overflow-hidden whitespace-pre-wrap break-all rounded-md bg-white px-4 py-2 pr-10 leading-normal focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900 dark:text-white sm:pr-12"
          />
          <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
            円
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            if (other.name !== "" || other.amount !== "") {
              onClear(index);
            } else {
              onRemove(index);
            }
          }}
          className="h-full min-h-10 w-full shrink-0 border-0 bg-white text-red-500 hover:bg-white hover:text-red-700 dark:bg-white dark:hover:bg-white"
          aria-label={
            other.name !== "" || other.amount !== ""
              ? `項目 ${index + 1} をクリア`
              : `項目 ${index + 1} を削除`
          }
        >
          {other.name !== "" || other.amount !== "" ? (
            <Eraser className="h-4 w-4 text-[var(--color-blue-600)]" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function OtherExpenses({ others, onChange, onClear, onAdd, onRemove }: Props) {
  return (
    <section className="space-y-4 rounded-lg bg-gray-100 px-4 py-8 dark:bg-zinc-800">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2 mb-8">
        その他
      </h2>
      {others.map((other, index) => (
        <OtherExpenseRow
          key={index}
          other={other}
          index={index}
          onChange={onChange}
          onClear={onClear}
          onRemove={onRemove}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onAdd}
        className="mt-4 h-10 w-full rounded-md border-dashed border-gray-300 bg-gray-100 text-sm font-semibold text-gray-500 hover:bg-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
      >
        <Plus className="size-4" />
        項目を追加
      </Button>
    </section>
  );
}
