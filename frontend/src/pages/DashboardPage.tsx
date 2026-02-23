import { useQuery } from "@tanstack/react-query";
import { Package, Eye, DollarSign, TrendingUp } from "lucide-react";
import ServiceMap from "@/components/map/ServiceMap";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { productsApi } from "@/api/products";
import { analyticsApi } from "@/api/analytics";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products", { page: 1, limit: 1 }],
    queryFn: () => productsApi.list({ page: 1, limit: 1 }),
  });

  const { data: topProducts, isLoading: loadingTop } = useQuery({
    queryKey: ["topProducts", { days: 1, limit: 50 }],
    queryFn: () => analyticsApi.topProducts({ days: 1, limit: 50 }),
  });

  const statsLoading = loadingProducts || loadingTop;

  const todayViews = topProducts?.items.reduce((sum, i) => sum + i.views, 0) ?? 0;
  const todayRevenue = topProducts?.items.reduce((sum, i) => sum + i.revenue, 0) ?? 0;
  const todayPurchases = topProducts?.items.reduce((sum, i) => sum + i.purchases, 0) ?? 0;

  const stats = [
    {
      label: "Total Products",
      value: products?.total ?? "--",
      icon: Package,
      color: "text-indigo-400",
    },
    {
      label: "Views Today",
      value: todayViews,
      icon: Eye,
      color: "text-cyan-400",
    },
    {
      label: "Purchases Today",
      value: todayPurchases,
      icon: TrendingUp,
      color: "text-emerald-400",
    },
    {
      label: "Revenue Today",
      value: typeof todayRevenue === "number" ? formatCurrency(todayRevenue) : "--",
      icon: DollarSign,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
        <p className="text-sm text-muted-foreground">
          Real-time system health and daily metrics
        </p>
      </div>

      {/* Service Map */}
      <ServiceMap />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <Skeleton className="mb-2 h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.label} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                    <stat.icon size={28} className={stat.color} />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
