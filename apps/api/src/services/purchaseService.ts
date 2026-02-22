import { analyticsQueue } from "../queue/analyticsQueue.js";
import * as repo from "../repositories/purchaseRepo.js";

export async function createPurchase(args: { userId: string; productId: string; qty: number; amount: number; }) {
  const purchase = await repo.createPurchase(args);
  await analyticsQueue.add("aggregate_purchase", { purchaseId: purchase.id }, { removeOnComplete: true, attempts: 3 });
  return { ...purchase, amount: Number(purchase.amount) };
}
