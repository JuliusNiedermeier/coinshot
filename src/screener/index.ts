import { distinctUntilChanged, filter, map, mergeMap, switchMap, take, takeUntil, timer } from "rxjs";
import { allPoolUpdates } from "./all-pool-updates";
import { createPoolObservable } from "./pool-observable";
import { asExistingAccount } from "../utils";
import { Address } from "@solana/kit";
import { Token, TokenAmount } from "@raydium-io/raydium-sdk-v2";

const tradingObservationMs = 1000 * 60 * 10; // 10 Min

export interface GetPoolUpdateObservableConfig {}

export const createScreener = (config: GetPoolUpdateObservableConfig) => {
  console.log("🔍 Scanning the blockchain for newly created CPMM pools on Raydium...");

  const currentlyObservedPools = new Set<Address>();

  return allPoolUpdates.pipe(
    // Skip pools that are already being observed.
    filter((pool) => !currentlyObservedPools.has(pool.address)),

    // Skip pools that are already open for trading.
    filter((pool) => Number(pool.data.openTime) * 1000 > Date.now()),

    // Skip pools that do not open in the next 5 minutes
    filter((pool) => Number(pool.data.openTime) * 1000 - Date.now() < 1000 * 60 * 5),

    // Specify how many pools to observe until exiting.
    // Useful during development to check tear down behaviour.
    take(Infinity),

    // Start observing the pool and it's related accounts.
    mergeMap((pool) => {
      console.log(`👀 Pool ${pool.address} DETECTED`);

      currentlyObservedPools.add(pool.address);

      // Get the pool data and its related accounts.
      // Emit only if the pool exists.
      const poolObservable = createPoolObservable(pool.address).pipe(
        filter((pool) => pool.value.exists),
        map(({ context, value }) => ({ context, value: asExistingAccount(value) }))
      );

      const openTimeObservable = poolObservable.pipe(
        distinctUntilChanged((prev, curr) => prev.value.data.openTime === curr.value.data.openTime),
        map((pool) => new Date(Number(pool.value.data.openTime) * 1000))
      );

      const openTimeReached = openTimeObservable.pipe(
        switchMap((openTime) => timer(openTime)),
        take(1)
      );

      const shutdownTimeReached = openTimeObservable.pipe(
        switchMap((openTime) => timer(new Date(Number(openTime) + tradingObservationMs))),
        take(1)
      );

      openTimeReached.subscribe(() => console.log(`🚀 Pool ${pool.address} OPENED)`));

      shutdownTimeReached.subscribe(() => {
        console.log(`🗑️ Pool ${pool.address} DROPPED`);
        currentlyObservedPools.delete(pool.address);
      });

      return poolObservable.pipe(
        filter((pool) => pool.value.data.lpMint.value.exists),

        map((pool) => {
          const lpToken = new Token({
            mint: pool.value.data.lpMint.value.address,
            decimals: pool.value.data.lpMintDecimals,
          });

          const lpTokenInitialSupply = new TokenAmount(lpToken, pool.value.data.lpSupply);
          const lpTokenSupply = new TokenAmount(lpToken, asExistingAccount(pool.value.data.lpMint.value).data.supply);

          const lpBurned = lpTokenInitialSupply.subtract(lpTokenSupply);
          const lpBurnedPercentage = lpBurned.div(lpTokenInitialSupply);

          return {
            pool: pool.value.address,
            lpTokenInitialSupply: lpTokenInitialSupply.raw.toString(),
            lpTokenSupply: lpTokenSupply.raw.toString(),
            lpBurned: lpBurned.raw.toString(),
            lpBurnedPercentage: lpBurnedPercentage.mul(100).toFixed(4),
          };
        }),

        // Only emit when burn amount changes.
        distinctUntilChanged((prev, curr) => prev.lpBurned === curr.lpBurned),

        // Stop observing when the shutdown time is reached.
        takeUntil(shutdownTimeReached)
      );
    })
  );
};
