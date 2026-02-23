import { pgPool } from "../config/db.js";

const ALLOWED_SORT_COLS: Record<string, string> = {
  views: "sum(views)",
  clicks: "sum(clicks)",
  add_to_carts: "sum(add_to_carts)",
  checkout_starts: "sum(checkout_starts)",
  purchases: "sum(purchases)",
  revenue: "sum(revenue)",
};

export async function topProducts(
  days: number,
  limit: number,
  sortBy: string = "views",
) {
  const orderExpr = ALLOWED_SORT_COLS[sortBy] ?? ALLOWED_SORT_COLS.views;
  const res = await pgPool.query(
    `select s.product_id,
            coalesce(p.name, s.product_id::text) as product_name,
            sum(s.views)::int as views,
            sum(s.clicks)::int as clicks,
            sum(s.add_to_carts)::int as add_to_carts,
            sum(s.checkout_starts)::int as checkout_starts,
            sum(s.purchases)::int as purchases,
            sum(s.revenue)::numeric as revenue
       from product_daily_stats s
       left join products p on p.id = s.product_id
      where s.day >= (current_date - ($1::int - 1))
      group by s.product_id, p.name
      order by ${orderExpr} desc
      limit $2`,
    [days, limit]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    product_id: r.product_id as string,
    product_name: r.product_name as string,
    views: Number(r.views),
    clicks: Number(r.clicks),
    add_to_carts: Number(r.add_to_carts),
    checkout_starts: Number(r.checkout_starts),
    purchases: Number(r.purchases),
    revenue: Number(r.revenue),
  }));
}

export async function productStats(
  days: number,
  sortBy: string,
  sortDir: string,
  page: number,
  limit: number,
  search?: string,
) {
  const orderExpr = ALLOWED_SORT_COLS[sortBy] ?? ALLOWED_SORT_COLS.views;
  const dir = sortDir === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * limit;

  const searchFilter = search ? `AND p.name ILIKE $2` : "";
  const searchParam = search ? [`%${search}%`] : [];

  const offsetIdx = search ? 3 : 2;
  const limitIdx = search ? 4 : 3;

  const countRes = await pgPool.query(
    `select count(distinct s.product_id)::int as total
       from product_daily_stats s
       left join products p on p.id = s.product_id
      where s.day >= (current_date - ($1::int - 1))
      ${searchFilter}`,
    [days, ...searchParam],
  );
  const total = Number(countRes.rows[0]?.total ?? 0);

  const res = await pgPool.query(
    `select s.product_id,
            coalesce(p.name, s.product_id::text) as product_name,
            sum(s.views)::int as views,
            sum(s.clicks)::int as clicks,
            sum(s.add_to_carts)::int as add_to_carts,
            sum(s.checkout_starts)::int as checkout_starts,
            sum(s.purchases)::int as purchases,
            sum(s.revenue)::numeric as revenue
       from product_daily_stats s
       left join products p on p.id = s.product_id
      where s.day >= (current_date - ($1::int - 1))
      ${searchFilter}
      group by s.product_id, p.name
      order by ${orderExpr} ${dir}
      offset $${offsetIdx} limit $${limitIdx}`,
    [days, ...searchParam, offset, limit],
  );

  const items = res.rows.map((r: Record<string, unknown>) => ({
    product_id: r.product_id as string,
    product_name: r.product_name as string,
    views: Number(r.views),
    clicks: Number(r.clicks),
    add_to_carts: Number(r.add_to_carts),
    checkout_starts: Number(r.checkout_starts),
    purchases: Number(r.purchases),
    revenue: Number(r.revenue),
  }));

  return { total, page, limit, items };
}

export async function productTimeseries(productId: string, days: number) {
  const res = await pgPool.query(
    `select day, views, clicks, add_to_carts, checkout_starts, purchases, revenue
       from product_daily_stats
      where product_id=$1 and day >= (current_date - ($2::int - 1))
      order by day asc`,
    [productId, days]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    day: r.day as string,
    views: Number(r.views),
    clicks: Number(r.clicks),
    add_to_carts: Number(r.add_to_carts),
    checkout_starts: Number(r.checkout_starts),
    purchases: Number(r.purchases),
    revenue: Number(r.revenue),
  }));
}

export async function overallTimeseries(days: number) {
  const res = await pgPool.query(
    `select day,
            sum(views)::int as views,
            sum(clicks)::int as clicks,
            sum(add_to_carts)::int as add_to_carts,
            sum(checkout_starts)::int as checkout_starts,
            sum(purchases)::int as purchases,
            sum(revenue)::numeric as revenue
       from product_daily_stats
      where day >= (current_date - ($1::int - 1))
      group by day
      order by day asc`,
    [days]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    day: r.day as string,
    views: Number(r.views),
    clicks: Number(r.clicks),
    add_to_carts: Number(r.add_to_carts),
    checkout_starts: Number(r.checkout_starts),
    purchases: Number(r.purchases),
    revenue: Number(r.revenue),
  }));
}

export async function overviewStats(days: number) {
  const res = await pgPool.query(
    `select
        sum(views)::int as views,
        sum(clicks)::int as clicks,
        sum(add_to_carts)::int as add_to_carts,
        sum(checkout_starts)::int as checkout_starts,
        sum(purchases)::int as purchases,
        sum(revenue)::numeric as revenue,
        count(distinct product_id)::int as active_products
      from product_daily_stats
      where day >= (current_date - ($1::int - 1))`,
    [days]
  );
  const row = res.rows[0] || {};
  return {
    views: Number(row.views || 0),
    clicks: Number(row.clicks || 0),
    add_to_carts: Number(row.add_to_carts || 0),
    checkout_starts: Number(row.checkout_starts || 0),
    purchases: Number(row.purchases || 0),
    revenue: Number(row.revenue || 0),
    active_products: Number(row.active_products || 0),
  };
}

export async function overviewStatsPrev(days: number) {
  const res = await pgPool.query(
    `select
        sum(views)::int as views,
        sum(clicks)::int as clicks,
        sum(add_to_carts)::int as add_to_carts,
        sum(checkout_starts)::int as checkout_starts,
        sum(purchases)::int as purchases,
        sum(revenue)::numeric as revenue
      from product_daily_stats
      where day >= (current_date - ($1::int * 2 - 1))
        and day < (current_date - ($1::int - 1))`,
    [days]
  );
  const row = res.rows[0] || {};
  return {
    views: Number(row.views || 0),
    clicks: Number(row.clicks || 0),
    add_to_carts: Number(row.add_to_carts || 0),
    checkout_starts: Number(row.checkout_starts || 0),
    purchases: Number(row.purchases || 0),
    revenue: Number(row.revenue || 0),
  };
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
