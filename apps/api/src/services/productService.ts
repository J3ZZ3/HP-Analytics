import { ApiError } from "../utils/errors.js";
import * as repo from "../repositories/productRepo.js";
import { cacheDel } from "../cache/cache.js";

function normalize(p: repo.DbProduct) {
  return { ...p, price: Number(p.price) };
}

export async function listProducts(args: {
  status?: string;
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
  sort_dir?: string;
  page: number;
  limit: number;
}) {
  const page = Math.max(1, args.page);
  const limit = Math.min(100, Math.max(1, args.limit));
  const offset = (page - 1) * limit;
  const { total, items } = await repo.listProducts({
    status: args.status,
    search: args.search,
    category: args.category,
    min_price: args.min_price,
    max_price: args.max_price,
    sort_by: args.sort_by,
    sort_dir: args.sort_dir,
    limit,
    offset,
  });
  return { page, limit, total, items: items.map(normalize) };
}

export async function getProduct(id: string) {
  const prod = await repo.getProductById(id);
  if (!prod) throw new ApiError(404, "NOT_FOUND", "Product not found");
  return normalize(prod);
}

export async function createProduct(data: {
  name: string;
  price: number;
  status: "active" | "inactive";
  description?: string;
  image_url?: string;
  category?: string;
}) {
  const prod = await repo.createProduct(data);
  return normalize(prod);
}

export async function updateProduct(
  id: string,
  patch: Partial<{
    name: string;
    price: number;
    status: "active" | "inactive";
    description: string;
    image_url: string;
    category: string;
  }>,
) {
  const updated = await repo.updateProduct(id, patch);
  if (!updated) throw new ApiError(404, "NOT_FOUND", "Product not found");
  await cacheDel([`product:${id}`]);
  return normalize(updated);
}

export async function deleteProduct(id: string) {
  const ok = await repo.deleteProduct(id);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Product not found");
  await cacheDel([`product:${id}`]);
  return ok;
}

export async function listCategories() {
  return repo.listCategories();
}
