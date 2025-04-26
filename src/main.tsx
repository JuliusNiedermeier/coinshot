import { createScreener } from "./screener";
import { Subscription } from "rxjs";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { keepAlive } from "./keep-alive";
import { getPoolUpdates, addPoolUpdate, Pool } from "./persist-logs";
import { type FC } from "hono/jsx";

let subscription: Subscription | null = null;

const enableScreener = () => {
  if (subscription && !subscription.closed) return "already-enabled" as const;

  subscription = createScreener({}).subscribe(async ({ pool, ...update }) => {
    console.log(`📝 Persisting update for pool ${pool}`);
    await addPoolUpdate(pool, { ...update, timestamp: Date.now() });
  });

  return "enabled" as const;
};

const PoolList: FC<{ pools: Pool[] }> = ({ pools }) => {
  return (
    <html>
      <body
        style={{
          margin: 10,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontFamily: "monospace",
          backgroundColor: "#d3d3d3",
        }}
      >
        {pools.map(({ pool, updates }) => (
          <div style={{ borderRadius: 5, padding: 3, border: "1px solid darkgray" }}>
            <div style={{ borderRadius: 4, padding: 5, backgroundColor: "#282828", color: "white" }}>{pool}</div>
            {updates.map((update) => {
              const someBurnt = parseFloat(update.lpBurnedPercentage) > 0;
              return (
                <pre
                  style={{
                    borderRadius: 4,
                    padding: 5,
                    backgroundColor: someBurnt ? "#79d79a" : "white",
                    marginTop: 3,
                    marginBottom: 0,
                  }}
                >
                  {JSON.stringify(update, null, 2)}
                </pre>
              );
            })}
          </div>
        ))}
      </body>
    </html>
  );
};

const app = new Hono();

// Get persisted pool lp burn percentage updates
app.get("/", async (ctx) => {
  const minQuery = ctx.req.query("min");
  const maxQuery = ctx.req.query("max");

  const min = minQuery ? parseFloat(minQuery) : undefined;
  const max = maxQuery ? parseFloat(maxQuery) : undefined;

  if (min !== undefined && isNaN(min)) return ctx.text("Query parameter min must be a valid number.", 400);
  if (max !== undefined && isNaN(max)) return ctx.text("Query parameter max must be a valid number.", 400);

  const pools = await getPoolUpdates({ burnPercentage: { min, max } });

  return ctx.html(<PoolList pools={pools} />);
});

// Enable the screener
app.post("/screener/enable", (ctx) => {
  const status = enableScreener();
  if (status === "already-enabled") return ctx.text("Screener is already enabled.");
  return ctx.text("Screener enabled.");
});

// Disable the screener
app.post("/screener/disable", (ctx) => {
  if (!subscription || subscription.closed) return ctx.text("Screener is already disabled.");
  subscription.unsubscribe();
  return ctx.text("Screener disabled.");
});

// Enable keep-alive
app.post("/keepalive/enable", (ctx) => {
  if (keepAlive.isActive) return ctx.text("Keep-alive is already enabled.");
  keepAlive.start();
  return ctx.text("Keep-alive enabled.");
});

// Disable keep-alive
app.post("/keepalive/disable", (ctx) => {
  if (!keepAlive.isActive) return ctx.text("Keep-alive is already disabled.");
  keepAlive.stop();
  return ctx.text("Keep-alive disabled.");
});

// Serve the app
serve(app, (info) => console.log(`⚡ Server running at ${process.env.BASE_URL}:${info.port}`));

// Enable the screener if configured
if (process.env.AUTO_ENABLE_SCREENER === "true") enableScreener();

// Enable keep-alive if configured
if (process.env.AUTO_ENABLE_KEEPALIVE === "true") keepAlive.start();
