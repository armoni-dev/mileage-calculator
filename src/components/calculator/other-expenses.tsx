import { Eraser, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OtherInput } from "@/lib/calculator";

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

export default function OtherExpenses({ others, onChange, onClear, onAdd, onRemove }: Props) {
  return (
    <section className="space-y-4 rounded-lg bg-gray-100 px-4 py-8 dark:bg-zinc-800">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2 mb-8">
        その他
      </h2>
      {others.map((other, index) => (
        <div key={index} className="grid grid-cols-1 gap-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            項目 {index + 1}
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2">
            <input
              type="text"
              value={other.name}
              onChange={(event) => onChange(index, "name", event.target.value)}
              placeholder="例: 駐車料金"
              className="h-10 w-full min-w-0 px-4 py-2 rounded-md bg-white dark:bg-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="relative min-w-0">
              <input
                type="text"
                inputMode="numeric"
                value={other.amount}
                onChange={(event) => {
                  const converted = toHalfWidth(event.target.value);
                  onChange(index, "amount", converted);
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
                className="h-10 w-full px-4 py-2 pr-10 sm:pr-12 rounded-md bg-white dark:bg-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">円</span>
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
              className="h-10 w-10 shrink-0 bg-white text-red-500 hover:bg-white hover:text-red-700 dark:bg-white dark:hover:bg-white"
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
