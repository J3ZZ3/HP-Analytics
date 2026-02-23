import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { productsApi } from "@/api/products";
import { analyticsApi } from "@/api/analytics";
import { eventsApi } from "@/api/events";
import { purchasesApi } from "@/api/purchases";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import TimeseriesChart from "@/components/charts/TimeseriesChart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [days, setDays] = useState(30);
  const [qty, setQty] = useState(1);
  const { toast } = useToast();
  const viewTracked = useRef(false);

  useEffect(() => {
    if (id && !viewTracked.current) {
      viewTracked.current = true;
      eventsApi.create({ product_id: id, type: "view" }).catch(() => {});
    }
  }, [id]);

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.get(id!),
    enabled: !!id,
  });

  const { data: timeseries, isLoading: loadingChart } = useQuery({
    queryKey: ["timeseries", id, days],
    queryFn: () => analyticsApi.timeseries(id!, days),
    enabled: !!id,
  });

  const purchaseMut = useMutation({
    mutationFn: () => purchasesApi.create(id!, qty),
    onSuccess: () => {
      toast("success", `Recorded purchase of ${qty} unit${qty > 1 ? "s" : ""}`);
      setQty(1);
    },
    onError: () => toast("error", "Failed to record purchase"),
  });

  if (loadingProduct) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-3 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><Skeleton className="mb-1 h-3 w-12" /><Skeleton className="h-6 w-20" /></div>
              <div><Skeleton className="mb-1 h-3 w-12" /><Skeleton className="h-6 w-24" /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center text-muted-foreground">Product not found</div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} />
        Back to Products
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{product.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                ID: {product.id}
              </p>
            </div>
            <Badge variant={product.status === "active" ? "success" : "warning"}>
              {product.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Price</p>
              <p className="text-lg font-semibold">{formatCurrency(product.price)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Category</p>
              <p className="text-lg font-semibold">{product.category || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Created</p>
              <p className="text-lg font-semibold">
                {product.created_at
                  ? new Date(product.created_at).toLocaleDateString()
                  : "--"}
              </p>
            </div>
          </div>
          {product.description && (
            <p className="mt-4 text-sm text-muted-foreground">{product.description}</p>
          )}
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="mt-4 h-48 w-auto rounded-lg border border-border object-contain"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <ShoppingCart size={20} className="shrink-0 text-muted-foreground" />
          <div className="flex flex-1 items-center gap-3">
            <label className="text-sm font-medium text-foreground">Qty</label>
            <Input
              type="number"
              min={1}
              max={999}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="w-20"
            />
            <Button
              onClick={() => purchaseMut.mutate()}
              disabled={purchaseMut.isPending}
            >
              {purchaseMut.isPending ? "Recording..." : "Record Purchase"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance</CardTitle>
            <Select value={days.toString()} onChange={(e) => setDays(Number(e.target.value))}>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingChart ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : timeseries?.points.length ? (
            <TimeseriesChart data={timeseries.points} />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              No data available for this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
