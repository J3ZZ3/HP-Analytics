import { pgPool } from "../config/db.js";
import { redis } from "../config/redis.js";

export async function aggregateToday(): Promise<void> {
  await pgPool.query(
    `insert into product_daily_stats (product_id, day, views, purchases, revenue)
     select p.id as product_id,
            current_date as day,
            coalesce(sum(case when e.type='view' then 1 else 0 end),0)::int as views,
            coalesce(count(distinct pu.id),0)::int as purchases,
            coalesce(sum(pu.amount),0)::numeric as revenue
       from products p
       left join events e on e.product_id=p.id and e.ts::date=current_date
       left join purchases pu on pu.product_id=p.id and pu.ts::date=current_date
      group by p.id
     on conflict (product_id, day) do update
       set views=excluded.views,
           purchases=excluded.purchases,
           revenue=excluded.revenue`
  );

  await pgPool.query(
    `insert into user_daily_stats (user_id, day, views, purchases, spend)
     select u.id as user_id,
            current_date as day,
            coalesce(sum(case when e.type='view' then 1 else 0 end),0)::int as views,
            coalesce(count(distinct pu.id),0)::int as purchases,
            coalesce(sum(pu.amount),0)::numeric as spend
       from users u
       left join events e on e.user_id=u.id and e.ts::date=current_date
       left join purchases pu on pu.user_id=u.id and pu.ts::date=current_date
      group by u.id
     on conflict (user_id, day) do update
       set views=excluded.views,
           purchases=excluded.purchases,
           spend=excluded.spend`
  );

  await invalidateAnalyticsCaches();
}

async function invalidateAnalyticsCaches(): Promise<void> {
  const patterns = ["top_products:*", "user_summary:*"];
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
