import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TimeseriesPoint } from "@/types";

interface DailyConversionChartProps {
  data: TimeseriesPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-emerald-400">
        Conversion: {payload[0].value.toFixed(2)}%
      </p>
    </div>
  );
}

export default function DailyConversionChart({ data }: DailyConversionChartProps) {
  const formatted = data.map((p) => ({
    day: new Date(p.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    conversion: p.views > 0 ? Math.round((p.purchases / p.views) * 10000) / 100 : 0,
  }));

  const avg =
    formatted.length > 0
      ? formatted.reduce((s, p) => s + p.conversion, 0) / formatted.length
      : 0;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={{ stroke: "#1e293b" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={{ stroke: "#1e293b" }}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={avg}
          stroke="#94a3b8"
          strokeDasharray="3 3"
          label={{
            value: `Avg ${avg.toFixed(1)}%`,
            fill: "#94a3b8",
            fontSize: 10,
            position: "right",
          }}
        />
        <Line
          type="monotone"
          dataKey="conversion"
          name="Conversion %"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 2, fill: "#22c55e" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
