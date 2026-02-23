import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Eye,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { analyticsApi } from "@/api/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import RevenueAreaChart from "@/components/charts/RevenueAreaChart";
import ViewsPurchasesChart from "@/components/charts/ViewsPurchasesChart";
import DailyConversionChart from "@/components/charts/DailyConversionChart";
import ProductBarList from "@/components/charts/ProductBarList";
import { formatCurrency } from "@/lib/utils";
import type { ProductSortBy, SortDir } from "@/types";
import {
  MOCK_ENABLED,
  getMockOverview,
  getMockTimeseries,
  getMockTopProducts,
  getMockProductStats,
} from "@/mocks/analyticsMock";

function TrendBadge({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus size={12} /> 0%
      </span>
    );
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-400">
        <TrendingUp size={12} /> +{value}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-400">
      <TrendingDown size={12} /> {value}%
    </span>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-1 h-8 w-32" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [chartLimit, setChartLimit] = useState(10);

  const [tablePage, setTablePage] = useState(1);
  const [tableSort, setTableSort] = useState<ProductSortBy>("views");
  const [tableSortDir, setTableSortDir] = useState<SortDir>("desc");
  const [tableSearch, setTableSearch] = useState("");
  const tableLimit = 20;

  const mockOverview = useMemo(() => getMockOverview(days), [days]);
  const mockTimeseries = useMemo(() => getMockTimeseries(days), [days]);
  const mockAllProducts = useMemo(() => getMockTopProducts(days, 250), [days]);
  const mockProductStats = useMemo(
    () => getMockProductStats(days, tableSort, tableSortDir, tablePage, tableLimit, tableSearch || undefined),
    [days, tableSort, tableSortDir, tablePage, tableSearch],
  );

  const { data: overviewRaw, isLoading: overviewLoading } = useQuery({
    queryKey: ["overview", days],
    queryFn: () => analyticsApi.overview(days),
    retry: 1,
    enabled: !MOCK_ENABLED,
  });
  const { data: timeseriesRaw, isLoading: tsLoading } = useQuery({
    queryKey: ["overallTimeseries", days],
    queryFn: () => analyticsApi.overallTimeseries(days),
    retry: 1,
    enabled: !MOCK_ENABLED,
  });
  const { data: allProductsRaw, isLoading: topLoading } = useQuery({
    queryKey: ["topProducts", { days }],
    queryFn: () => analyticsApi.topProducts({ days, limit: 250 }),
    retry: 1,
    enabled: !MOCK_ENABLED,
  });
  const { data: productStatsRaw, isLoading: statsLoading } = useQuery({
    queryKey: ["productStats", { days, sort_by: tableSort, sort_dir: tableSortDir, page: tablePage, limit: tableLimit, search: tableSearch }],
    queryFn: () =>
      analyticsApi.productStats({
        days,
        sort_by: tableSort,
        sort_dir: tableSortDir,
        page: tablePage,
        limit: tableLimit,
        search: tableSearch || undefined,
      }),
    placeholderData: keepPreviousData,
    retry: 1,
    enabled: !MOCK_ENABLED,
  });

  const overview = overviewRaw ?? mockOverview;
  const timeseries = timeseriesRaw ?? mockTimeseries;
  const allProductItems = (allProductsRaw ?? mockAllProducts).items;
  const productStats = productStatsRaw ?? mockProductStats;
  const usingMock = MOCK_ENABLED || (!overviewRaw && !overviewLoading);

  const chartProducts = useMemo(
    () => allProductItems.slice(0, chartLimit),
    [allProductItems, chartLimit],
  );

  const kpis = overview
    ? [
        { label: "Total Views", value: overview.views.toLocaleString(), change: overview.changes.views, icon: Eye, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        { label: "Total Purchases", value: overview.purchases.toLocaleString(), change: overview.changes.purchases, icon: ShoppingCart, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { label: "Total Revenue", value: formatCurrency(overview.revenue), change: overview.changes.revenue, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
        { label: "Active Products", value: overview.active_products.toLocaleString(), change: null, icon: Package, color: "text-sky-400", bg: "bg-sky-500/10" },
        { label: "Conversion Rate", value: `${overview.conversion_rate}%`, change: null, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" },
      ]
    : [];

  const totalPages = Math.max(1, Math.ceil((productStats?.total ?? 0) / tableLimit));

  function handleTableSort(col: ProductSortBy) {
    if (tableSort === col) {
      setTableSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setTableSort(col);
      setTableSortDir("desc");
    }
    setTablePage(1);
  }

  function SortIcon({ col }: { col: ProductSortBy }) {
    if (tableSort !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return tableSortDir === "desc"
      ? <ArrowDown size={12} className="text-foreground" />
      : <ArrowUp size={12} className="text-foreground" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Performance overview &middot; last {days} days vs previous {days} days
          </p>
        </div>
        <Select value={days.toString()} onChange={(e) => { setDays(Number(e.target.value)); setTablePage(1); }}>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </div>

      {usingMock && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          <Activity size={16} />
          Showing demo data &mdash; API is not connected
        </div>
      )}

      {/* KPI Cards */}
      {overviewLoading && !usingMock ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                  <div className={`rounded-lg p-2 ${kpi.bg}`}>
                    <kpi.icon size={16} className={kpi.color} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{kpi.value}</p>
                {kpi.change !== null && <TrendBadge value={kpi.change} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Time-series charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            {tsLoading && !usingMock ? <ChartSkeleton /> : timeseries?.points.length ? (
              <RevenueAreaChart data={timeseries.points} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Views &amp; Purchases</CardTitle></CardHeader>
          <CardContent>
            {tsLoading && !usingMock ? <ChartSkeleton /> : timeseries?.points.length ? (
              <ViewsPurchasesChart data={timeseries.points} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily conversion */}
      <Card>
        <CardHeader><CardTitle>Daily Conversion Rate</CardTitle></CardHeader>
        <CardContent>
          {tsLoading && !usingMock ? <ChartSkeleton /> : timeseries?.points.length ? (
            <DailyConversionChart data={timeseries.points} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      {/* Product Analysis Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">Product Analysis</h2>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Top</label>
          <Select
            className="h-8 w-auto text-xs"
            value={chartLimit.toString()}
            onChange={(e) => setChartLimit(Number(e.target.value))}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
          <span className="text-xs text-muted-foreground">products</span>
        </div>
      </div>

      {/* Product Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Product Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {topLoading && !usingMock ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="mb-1 h-4 w-3/4" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <ProductBarList data={chartProducts} />
          )}
        </CardContent>
      </Card>

      {/* Full Product Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Products</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {productStats.total} product{productStats.total !== 1 ? "s" : ""} total
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-8 text-sm"
                placeholder="Search products..."
                value={tableSearch}
                onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => handleTableSort("views")}>
                      Views <SortIcon col="views" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => handleTableSort("purchases")}>
                      Purchases <SortIcon col="purchases" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => handleTableSort("revenue")}>
                      Revenue <SortIcon col="revenue" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Conv.</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {statsLoading && !usingMock ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                    </tr>
                  ))
                ) : productStats.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      {tableSearch ? "No products match your search" : "No data"}
                    </td>
                  </tr>
                ) : (
                  productStats.items.map((item, i) => {
                    const rank = (tablePage - 1) * tableLimit + i + 1;
                    const conv = item.views > 0 ? ((item.purchases / item.views) * 100).toFixed(1) : "0.0";
                    const avgOrder = item.purchases > 0 ? formatCurrency(item.revenue / item.purchases) : "-";
                    return (
                      <tr key={item.product_id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="px-4 py-3 text-muted-foreground">{rank}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{item.product_name}</td>
                        <td className="px-4 py-3 text-right text-foreground">{item.views.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-foreground">{item.purchases.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{conv}%</td>
                        <td className="px-4 py-3 text-right text-foreground">{avgOrder}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Page {tablePage} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40"
                  disabled={tablePage <= 1}
                  onClick={() => setTablePage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (tablePage <= 3) page = i + 1;
                  else if (tablePage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = tablePage - 2 + i;
                  return (
                    <button
                      key={page}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-xs ${
                        page === tablePage
                          ? "border border-primary bg-primary/10 font-semibold text-primary"
                          : "border border-border text-muted-foreground hover:bg-secondary"
                      }`}
                      onClick={() => setTablePage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40"
                  disabled={tablePage >= totalPages}
                  onClick={() => setTablePage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
