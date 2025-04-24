import { readFile, writeFile } from "fs/promises";
import { Result } from "try";

type PoolUpdate = { lpBurnedPercentage: number; timestamp: number };
type Pool = { pool: string; updates: PoolUpdate[] };

export const getPoolUpdates = async () => {
  const [exists, err, file] = await Result.try(() => readFile("pools.json", "utf-8"));
  return (exists ? JSON.parse(file) : []) as Pool[];
};

export const addPoolUpdate = async (pool: string, lpBurnedPercentage: number) => {
  const pools = await getPoolUpdates();

  const existingPoolIndex = pools.findIndex((entry) => entry.pool === pool);
  if (existingPoolIndex < 0) pools.push({ pool, updates: [{ lpBurnedPercentage, timestamp: Date.now() }] });
  else pools[existingPoolIndex].updates.push({ lpBurnedPercentage, timestamp: Date.now() });

  await writeFile("pools.json", JSON.stringify(pools));
};
