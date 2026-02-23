import { useState } from "react";
import type { TopProductItem, ProductSortBy } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ProductBarListProps {
  data: TopProductItem[];
}

const TABS: { key: ProductSortBy; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "purchases", label: "Purchases" },
  { key: "revenue", label: "Revenue" },
];

const BAR_COLORS: Record<ProductSortBy, string> = {
  views: "bg-indigo-500",
  purchases: "bg-emerald-500",
  revenue: "bg-amber-500",
};

const TEXT_COLORS: Record<ProductSortBy, string> = {
  views: "text-indigo-400",
  purchases: "text-emerald-400",
  revenue: "text-amber-400",
};

function formatValue(key: ProductSortBy, value: number) {
  if (key === "revenue") return formatCurrency(value);
  return value.toLocaleString();
}

export default function ProductBarList({ data }: ProductBarListProps) {
  const [metric, setMetric] = useState<ProductSortBy>("views");

  const sorted = [...data].sort(
    (a, b) => (b[metric] as number) - (a[metric] as number),
  );
  const max = sorted.length > 0 ? (sorted[0][metric] as number) : 1;

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-secondary/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMetric(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              metric === tab.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[600px] overflow-y-auto pr-1">
        <table className="w-full">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-10 pb-2 pr-2 text-right font-medium">#</th>
              <th className="pb-2 pr-4 text-left font-medium">Product</th>
              <th className="w-24 pb-2 pr-2 text-right font-medium">
                {TABS.find((t) => t.key === metric)?.label}
              </th>
              <th className="pb-2 text-left font-medium" style={{ width: "40%" }}>
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, idx) => {
              const value = item[metric] as number;
              const pct = max > 0 ? (value / max) * 100 : 0;
              return (
                <tr
                  key={item.product_id}
                  className="group border-b border-border/30 hover:bg-secondary/20"
                >
                  <td className="py-2 pr-2 text-right text-xs tabular-nums text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="py-2 pr-4 text-sm font-medium text-foreground">
                    {item.product_name || item.product_id}
                  </td>
                  <td className={`py-2 pr-2 text-right text-sm tabular-nums font-semibold ${TEXT_COLORS[metric]}`}>
                    {formatValue(metric, value)}
                  </td>
                  <td className="py-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[metric]}`}
                        style={{ width: `${Math.max(pct, 0.5)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No product data available
          </p>
        )}
      </div>
    </div>
  );
}
