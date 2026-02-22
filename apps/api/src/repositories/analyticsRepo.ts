import { pgPool } from "../config/db.js";

export async function topProducts(days: number, limit: number) {
  const res = await pgPool.query(
    `select product_id,
            sum(views)::int as views,
            sum(purchases)::int as purchases,
            sum(revenue)::numeric as revenue
       from product_daily_stats
      where day >= (current_date - ($1::int - 1))
      group by product_id
      order by sum(views) desc
      limit $2`,
    [days, limit]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    product_id: r.product_id as string,
    views: Number(r.views),
    purchases: Number(r.purchases),
    revenue: Number(r.revenue),
  }));
}

export async function productTimeseries(productId: string, days: number) {
  const res = await pgPool.query(
    `select day, views, purchases, revenue
       from product_daily_stats
      where product_id=$1 and day >= (current_date - ($2::int - 1))
      order by day asc`,
    [productId, days]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    day: r.day as string,
    views: Number(r.views),
    purchases: Number(r.purchases),
    revenue: Number(r.revenue),
  }));
}

export async function userSummary(userId: string, days: number) {
  const res = await pgPool.query(
    `select sum(views)::int as views,
            sum(purchases)::int as purchases,
            sum(spend)::numeric as spend
       from user_daily_stats
      where user_id=$1 and day >= (current_date - ($2::int - 1))`,
    [userId, days]
  );
  const row = res.rows[0] || { views: 0, purchases: 0, spend: 0 };
  return {
    views: Number(row.views || 0),
    purchases: Number(row.purchases || 0),
    spend: Number(row.spend || 0),
  };
}
