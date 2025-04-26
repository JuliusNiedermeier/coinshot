import { Redis } from "@upstash/redis";

const poolKeyPrefix = "pool:";
const createPoolKey = (pool: string) => `${poolKeyPrefix}${pool}`;
const getPoolIdFromPoolKey = (poolKey: string) => poolKey.replace(poolKeyPrefix, "");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

type PoolUpdate = { lpBurned: string; lpBurnedPercentage: string; timestamp: number };
export type Pool = { pool: string; updates: PoolUpdate[] };

export const addPoolUpdate = async (pool: string, update: PoolUpdate) => {
  await redis.lpush(createPoolKey(pool), update);
};

export const getPoolUpdates = async (filter?: { burnPercentage?: { min?: number; max?: number } }): Promise<Pool[]> => {
  const poolKeys = await redis.keys(createPoolKey("*"));

  const poolUpdates = await Promise.all(
    poolKeys.map(async (poolKey) => {
      return { pool: getPoolIdFromPoolKey(poolKey), updates: await redis.lrange<PoolUpdate>(poolKey, 0, -1) };
    })
  );

  if (!filter || !filter.burnPercentage) return poolUpdates;

  const { min, max } = filter.burnPercentage;

  return poolUpdates.filter(({ updates }) => {
    return updates.some(({ lpBurnedPercentage }) => {
      const passMin = min === undefined ? true : parseFloat(lpBurnedPercentage) >= min;
      const passMax = max === undefined ? true : parseFloat(lpBurnedPercentage) <= max;
      return passMin && passMax;
    });
  });
};
