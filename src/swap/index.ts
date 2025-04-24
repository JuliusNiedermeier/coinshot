import { BN } from "bn.js";
import { getRaydium } from "../config";
import { ApiV3PoolInfoStandardItemCpmm, CREATE_CPMM_POOL_PROGRAM, CurveCalculator } from "@raydium-io/raydium-sdk-v2";
import { PublicKey } from "@solana/web3.js";

export interface SwapConfig {
  direction: "in" | "out";
  pool: PublicKey;
  amount: number;
}

export const swap = async (config: SwapConfig) => {
  const raydium = await getRaydium();

  const [pool] = await raydium.api.fetchPoolById({ ids: config.pool.toBase58() });

  if (pool.programId !== CREATE_CPMM_POOL_PROGRAM.toBase58()) return null;

  const poolInfo = await raydium.cpmm.getRpcPoolInfo(pool.id, true);

  const inputAmount = new BN(config.amount);

  if (!poolInfo.configInfo) return null;

  const swapResult = CurveCalculator.swap(
    inputAmount,
    config.direction === "in" ? poolInfo.baseReserve : poolInfo.quoteReserve,
    config.direction === "in" ? poolInfo.quoteReserve : poolInfo.baseReserve,
    poolInfo.configInfo.tradeFeeRate
  );

  const data = await raydium.cpmm.swap({
    baseIn: config.direction === "in",
    inputAmount,
    swapResult,
    poolInfo: pool as ApiV3PoolInfoStandardItemCpmm,
    slippage: 0.001,
  });

  return data;
};
