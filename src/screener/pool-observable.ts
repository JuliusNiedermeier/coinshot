import { combineLatest, distinctUntilChanged, filter, map, switchMap } from "rxjs";
import { Address, address as createAddress, decodeAccount, MaybeAccount, SolanaRpcResponse } from "@solana/kit";
import { asExistingAccount, createAccountObservable } from "../utils";
import { cpmmPoolInfoDecoder } from "../codecs/cpmm-pool-info";
import { decodeMint, decodeToken } from "@solana-program/token-2022";
import { findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { umi } from "../config";
import { decodeMetaplexMetadataAccount } from "../utils/metaplex";

export const createPoolObservable = (poolAddress: Address, initialPool?: unknown) => {
  const poolObservable = createAccountObservable({
    address: poolAddress,
    decode: (account) => decodeAccount(account, cpmmPoolInfoDecoder),
  });

  // Derive a stream that only emits if the pool account exists,
  // which is used by the accounts referenced in the pool account.
  const existingPoolObservable = poolObservable.pipe(
    filter((pool) => pool.value.exists),
    map(({ context, value }) => ({ context, value: asExistingAccount(value) } satisfies SolanaRpcResponse<unknown>))
  );

  // LP Mint
  const mintLpObservable = existingPoolObservable.pipe(
    distinctUntilChanged((oldPool, newPool) => oldPool.value.data.mintLp === newPool.value.data.mintLp),
    switchMap((pool) => createAccountObservable({ address: pool.value.data.mintLp, decode: decodeMint }))
  );

  // Mints A
  const mintAObservable = existingPoolObservable.pipe(
    distinctUntilChanged((oldPool, newPool) => oldPool.value.data.mintA === newPool.value.data.mintA),
    switchMap((pool) => createAccountObservable({ address: pool.value.data.mintA, decode: decodeMint }))
  );

  // Mint B
  const mintBObservable = existingPoolObservable.pipe(
    distinctUntilChanged((oldPool, newPool) => oldPool.value.data.mintB === newPool.value.data.mintB),
    switchMap((pool) => createAccountObservable({ address: pool.value.data.mintB, decode: decodeMint }))
  );

  // Vault A
  const vaultAObservable = existingPoolObservable.pipe(
    distinctUntilChanged((oldPool, newPool) => oldPool.value.data.vaultA === newPool.value.data.vaultA),
    switchMap((pool) => createAccountObservable({ address: pool.value.data.vaultA, decode: decodeToken }))
  );

  // Vault B
  const vaultBObservable = existingPoolObservable.pipe(
    distinctUntilChanged((oldPool, newPool) => oldPool.value.data.vaultB === newPool.value.data.vaultB),
    switchMap((pool) => createAccountObservable({ address: pool.value.data.vaultB, decode: decodeToken }))
  );

  // Mint A Metaplex metadata
  const mintAMetaObservable = existingPoolObservable.pipe(
    distinctUntilChanged((oldPool, newPool) => oldPool.value.data.mintA === newPool.value.data.mintA),
    switchMap((pool) => {
      const address = createAddress(findMetadataPda(umi, { mint: publicKey(pool.value.data.mintA) })[0]);
      return createAccountObservable({ address, decode: decodeMetaplexMetadataAccount });
    })
  );

  // Mint B Metaplex metadata
  const mintBMetaObservable = existingPoolObservable.pipe(
    distinctUntilChanged((oldPool, newPool) => oldPool.value.data.mintB === newPool.value.data.mintB),
    switchMap((pool) => {
      const address = createAddress(findMetadataPda(umi, { mint: publicKey(pool.value.data.mintB) })[0]);
      return createAccountObservable({ address, decode: decodeMetaplexMetadataAccount });
    })
  );

  return combineLatest([
    poolObservable,
    mintLpObservable,
    mintAObservable,
    mintBObservable,
    vaultAObservable,
    vaultBObservable,
    mintAMetaObservable,
    mintBMetaObservable,
  ]).pipe(
    map(([pool, mintLp, mintA, mintB, vaultA, vaultB, mintAMeta, mintBMeta]) => {
      return {
        ...pool,
        value: pool.value.exists
          ? {
              ...pool.value,
              data: {
                ...pool.value.data,
                mintLp,
                mintA,
                mintB,
                vaultA,
                vaultB,
                mintAMeta,
                mintBMeta,
              },
            }
          : pool.value,
      } satisfies SolanaRpcResponse<MaybeAccount<any, any>>;
    })
  );
};
