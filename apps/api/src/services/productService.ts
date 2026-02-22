import { ApiError } from "../utils/errors.js";
import * as repo from "../repositories/productRepo.js";
import { cacheDel } from "../cache/cache.js";

export async function listProducts(args: { status?: string; page: number; limit: number; }) {
  const page = Math.max(1, args.page);
  const limit = Math.min(100, Math.max(1, args.limit));
  const offset = (page - 1) * limit;
  const { total, items } = await repo.listProducts({ status: args.status, limit, offset });
  return { page, limit, total, items: items.map(p => ({ ...p, price: Number(p.price) })) };
}

export async function getProduct(id: string) {
  const prod = await repo.getProductById(id);
  if (!prod) throw new ApiError(404, "NOT_FOUND", "Product not found");
  return { ...prod, price: Number(prod.price) };
}

export async function createProduct(data: { name: string; price: number; status: "active"|"inactive"; }) {
  const prod = await repo.createProduct(data);
  return { ...prod, price: Number(prod.price) };
}

export async function updateProduct(id: string, patch: Partial<{ name: string; price: number; status: "active"|"inactive"; }>) {
  const updated = await repo.updateProduct(id, patch);
  if (!updated) throw new ApiError(404, "NOT_FOUND", "Product not found");
  await cacheDel([`product:${id}`]);
  return { ...updated, price: Number(updated.price) };
}

export async function deleteProduct(id: string) {
  const ok = await repo.deleteProduct(id);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Product not found");
  await cacheDel([`product:${id}`]);
  return ok;
}
