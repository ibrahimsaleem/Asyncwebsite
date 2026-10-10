import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// USD→INR rate for showing amounts in both currencies. Refreshed twice a day from a free,
// keyless source; if that is down we keep the last good rate, or FX_USD_INR, or 96.
const TTL_MS = 12 * 60 * 60 * 1000;
let cached = { usdInr: Number(process.env.FX_USD_INR) || 96, fetchedAt: 0, source: "fallback" };

async function usdInr() {
  if (Date.now() - cached.fetchedAt < TTL_MS) return cached;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(4000) });
    const body = (await res.json()) as { rates?: { INR?: number } };
    const rate = Number(body.rates?.INR);
    if (rate > 10 && rate < 1000) cached = { usdInr: rate, fetchedAt: Date.now(), source: "open.er-api.com" };
    else throw new Error("unexpected rate");
  } catch (err) {
    logger.warn({ err }, "FX rate refresh failed; using last known rate");
    cached = { ...cached, fetchedAt: Date.now() - TTL_MS + 30 * 60 * 1000 }; // retry in 30 min
  }
  return cached;
}

router.get("/fx", requireAuth, async (_req, res): Promise<void> => {
  const { usdInr: rate, fetchedAt, source } = await usdInr();
  res.json({ usdInr: rate, asOf: fetchedAt ? new Date(fetchedAt).toISOString() : null, source });
});

export default router;
