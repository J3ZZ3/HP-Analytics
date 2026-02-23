import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { productsApi } from "@/api/products";
import { eventsApi } from "@/api/events";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import type { Product, ProductCreateRequest } from "@/types";

export default function ProductsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["products", { page, limit, status: statusFilter || undefined }],
    queryFn: () =>
      productsApi.list({
        page,
        limit,
        status: statusFilter || undefined,
      }),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const createMut = useMutation({
    mutationFn: (d: ProductCreateRequest) => productsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setCreateOpen(false);
      toast("success", "Product created");
    },
    onError: () => toast("error", "Failed to create product"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }: ProductCreateRequest & { id: string }) =>
      productsApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditProduct(null);
      toast("success", "Product updated");
    },
    onError: () => toast("error", "Failed to update product"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteProduct(null);
      toast("success", "Product deleted");
    },
    onError: () => toast("error", "Failed to delete product"),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} products total
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Add Product
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-8" /></td>
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No products found
                  </td>
                </tr>
              ) : (
                data?.items.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "active" ? "success" : "warning"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "--"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/products/${p.id}`}
                          onClick={() => eventsApi.create({ product_id: p.id, type: "click" }).catch(() => {})}
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink size={14} />
                          </Button>
                        </Link>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditProduct(p)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteProduct(p)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <ProductFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Product"
        onSubmit={(d) => createMut.mutate(d)}
        loading={createMut.isPending}
      />

      {/* Edit dialog */}
      <ProductFormDialog
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="Edit Product"
        initial={editProduct ?? undefined}
        onSubmit={(d) => editProduct && updateMut.mutate({ id: editProduct.id, ...d })}
        loading={updateMut.isPending}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        title="Delete Product"
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{deleteProduct?.name}</strong>? This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteProduct(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteProduct && deleteMut.mutate(deleteProduct.id)}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function ProductFormDialog({
  open,
  onClose,
  title,
  initial,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initial?: Product;
  onSubmit: (data: ProductCreateRequest) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPrice(initial?.price?.toString() ?? "");
      setStatus(initial?.status ?? "active");
      setDescription(initial?.description ?? "");
      setImageUrl(initial?.image_url ?? "");
      setCategory(initial?.category ?? "");
    }
  }, [open, initial]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      price: parseFloat(price),
      status: status as "active" | "inactive",
      description: description || undefined,
      image_url: imageUrl || undefined,
      category: category || undefined,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Price</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Category</label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Laptops, Desktops, Accessories"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Image URL</label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Product description..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
