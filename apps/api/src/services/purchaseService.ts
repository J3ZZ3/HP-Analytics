import { analyticsQueue } from "../queue/analyticsQueue.js";
import * as repo from "../repositories/purchaseRepo.js";

export async function createPurchase(args: { userId: string; productId: string; qty: number; amount: number }) {
  const purchase = await repo.createPurchase(args);
  await analyticsQueue.add("aggregate_purchase", { purchaseId: purchase.id }, { removeOnComplete: true, attempts: 3 });
  return { ...purchase, amount: Number(purchase.amount) };
}

export async function getUserPurchases(args: {
  userId: string;
  sortBy: string;
  sortDir: string;
  page: number;
  limit: number;
}) {
  const page = Math.max(1, args.page);
  const limit = Math.min(100, Math.max(1, args.limit));
  const offset = (page - 1) * limit;

  const { total, items } = await repo.getUserPurchases({
    userId: args.userId,
    sortBy: args.sortBy,
    sortDir: args.sortDir,
    limit,
    offset,
  });

  return {
    page,
    limit,
    total,
    items: items.map((p) => ({
      ...p,
      amount: Number(p.amount),
      product_price: Number(p.product_price),
    })),
  };
}
