import { Subscription } from "rxjs";
import { createScreener } from "./screener";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { addPoolUpdate, getPoolUpdates } from "./persist";
import { wakeupJob } from "./cron";

let subscription: Subscription | null = null;

const app = new Hono();

app.get("/", async (ctx) => {
  const minQuery = ctx.req.query("min");
  const maxQuery = ctx.req.query("max");

  const min = minQuery !== undefined ? parseFloat(minQuery) : null;
  const max = maxQuery !== undefined ? parseFloat(maxQuery) : null;

  if (min !== null && isNaN(min)) return ctx.text("Query parameter min must be a valid number.", 400);
  if (max !== null && isNaN(max)) return ctx.text("Query parameter max must be a valid number.", 400);

  const pools = (await getPoolUpdates()).filter((pool) => {
    return pool.updates.some(({ lpBurnedPercentage }) => {
      const passMin = min === null ? true : lpBurnedPercentage >= min;
      const passMax = max === null ? true : lpBurnedPercentage <= max;
      return passMin && passMax;
    });
  });

  return ctx.json(pools);
});

app.get("/start", (ctx) => {
  if (subscription && !subscription.closed) return ctx.text("Screener already running.");

  subscription = createScreener({}).subscribe(async (data) => {
    console.log(data);
    await addPoolUpdate(data.pool, parseFloat(data.lpBurnedPercentage.mul(100).toFixed(4)));
  });

  return ctx.text("Screener started.");
});

app.get("/stop", (ctx) => {
  if (!subscription || subscription.closed) return ctx.text("Screener already stopped.");
  subscription.unsubscribe();
  return ctx.text("Screener stopped.");
});

serve(app, (info) => console.log(`🚀 Server running at http://localhost:${info.port}`));

wakeupJob.start();
