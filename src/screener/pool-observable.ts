import { combineLatest, distinctUntilChanged, map, Observable, share, startWith, switchMap } from "rxjs";
import { Account, Address, address, decodeAccount, MaybeAccount, SolanaRpcResponse } from "@solana/kit";
import { createAccountObservable } from "../utils";
import { CpmmPoolInfo, cpmmPoolInfoDecoder } from "../codecs/cpmm-pool-info";
import { decodeMint, decodeToken } from "@solana-program/token-2022";
import { findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { umi } from "../config";
import { decodeMetaplexMetadataAccount } from "../utils/metaplex";

type NonExistingAccount<TAddress extends string = string> = Extract<MaybeAccount<object, TAddress>, { exists: false }>;

type ExistingAccount<TData extends Uint8Array | object, TAddress extends string = string> = Extract<
  MaybeAccount<TData, TAddress>,
  { exists: true }
>;

export const createPoolObservable = (poolAddress: Address, initialPool?: unknown) => {
  const maybePoolObservable = createAccountObservable({
    address: poolAddress,
    decode: (account) => decodeAccount(account, cpmmPoolInfoDecoder),
  });

  return maybePoolObservable.pipe(
    // Make sure switchMap is only called when the existence status of the observed pool changes.
    distinctUntilChanged((prev, curr) => prev.value.exists === curr.value.exists),

    // Switch between
    // a) passing through a MaybeAccount if the pool does not exist
    // b) enriching the pool account data with data of related accounts if the pool exists
    switchMap((latestPool) => {
      // To propagate the pool update that triggered the switchMap further downstream,
      // we need to manually add it back into the observable stream.
      const maybePoolObservableWithLatestPool = maybePoolObservable.pipe(startWith(latestPool));

      // Pass through the unenriched stream if the pool does not exist.
      // Assert the type of the pool to be a non-existing account type, that is stripped of its unenriched data properties.
      if (!latestPool.value.exists) {
        console.log(`⛓️‍💥 The observed pool ${poolAddress} currently doesn't exist. Waiting...`);
        return maybePoolObservableWithLatestPool as Observable<SolanaRpcResponse<NonExistingAccount>>;
      }

      console.log(`🔗 Setting up listeners for accounts related to pool ${poolAddress}`);

      // Map the type of the pool stream to an existing account for easier data access.
      // We don't need an additional existence check here, because we already know that the pool exists.
      const existingPoolObservableWithLatestPool = maybePoolObservableWithLatestPool as Observable<
        SolanaRpcResponse<Account<CpmmPoolInfo>>
      >;

      // LP Mint
      const lpMintObservable = existingPoolObservableWithLatestPool.pipe(
        distinctUntilChanged((oldPool, newPool) => oldPool.value.data.lpMint === newPool.value.data.lpMint),
        switchMap((pool) => createAccountObservable({ address: pool.value.data.lpMint, decode: decodeMint }))
      );

      // Token 0 Mint
      const token0MintObservable = existingPoolObservableWithLatestPool.pipe(
        distinctUntilChanged((oldPool, newPool) => oldPool.value.data.token0Mint === newPool.value.data.token0Mint),
        switchMap((pool) => createAccountObservable({ address: pool.value.data.token0Mint, decode: decodeMint }))
      );

      // Token 1 Mint
      const token1MintObservable = existingPoolObservableWithLatestPool.pipe(
        distinctUntilChanged((oldPool, newPool) => oldPool.value.data.token1Mint === newPool.value.data.token1Mint),
        switchMap((pool) => createAccountObservable({ address: pool.value.data.token1Mint, decode: decodeMint }))
      );

      // Token 0 Vault
      const token0VaultObservable = existingPoolObservableWithLatestPool.pipe(
        distinctUntilChanged((oldPool, newPool) => oldPool.value.data.token0Vault === newPool.value.data.token0Vault),
        switchMap((pool) => createAccountObservable({ address: pool.value.data.token0Vault, decode: decodeToken }))
      );

      // Token 1 Vault
      const token1VaultObservable = existingPoolObservableWithLatestPool.pipe(
        distinctUntilChanged((oldPool, newPool) => oldPool.value.data.token1Vault === newPool.value.data.token1Vault),
        switchMap((pool) => createAccountObservable({ address: pool.value.data.token1Vault, decode: decodeToken }))
      );

      // Token 0 Metaplex PDA
      const token0MintMetaplexPdaObservable = existingPoolObservableWithLatestPool.pipe(
        distinctUntilChanged((oldPool, newPool) => oldPool.value.data.token0Mint === newPool.value.data.token0Mint),
        switchMap((pool) => {
          return createAccountObservable({
            address: address(findMetadataPda(umi, { mint: publicKey(pool.value.data.token0Mint) })[0]),
            decode: decodeMetaplexMetadataAccount,
          });
        })
      );

      // Token 1 Metaplex PDA
      const token1MintMetaplexPdaObservable = existingPoolObservableWithLatestPool.pipe(
        distinctUntilChanged((oldPool, newPool) => oldPool.value.data.token1Mint === newPool.value.data.token1Mint),
        switchMap((pool) => {
          return createAccountObservable({
            address: address(findMetadataPda(umi, { mint: publicKey(pool.value.data.token1Mint) })[0]),
            decode: decodeMetaplexMetadataAccount,
          });
        })
      );

      // Pass on a new observable that combines the data of the pool and all its related accounts.
      return combineLatest([
        existingPoolObservableWithLatestPool,

        // Mints
        lpMintObservable,
        token0MintObservable,
        token0MintObservable,
        token1MintObservable,

        // Vaults
        token0VaultObservable,
        token1VaultObservable,

        // Metaplex PDAs
        token0MintMetaplexPdaObservable,
        token1MintMetaplexPdaObservable,
      ]).pipe(
        // Map the combined observable into the shape of a MaybeAccount containing the enriched data.
        map(
          ([
            existingPool,

            // Mints
            lpMint,
            token0Mint,
            token1Mint,

            // Vaults
            token0Vault,
            token1Vault,

            // Metaplex PDAs
            token0MintMetaplexPda,
            token1MintMetaplexPda,
          ]) => {
            return {
              context: existingPool.context,
              value: {
                // Add the base information included in every solana account.
                ...existingPool.value,

                // To satisfy the constraint of the MaybeAccount type, we need to add the `exists` property manually.
                // This is because we use the existingPoolObservableWithLatestPool in combineLatest, wich does not include the `exists` property.
                // To return a valid MaybeAccount, regardless of wich path we take at switchMap, the exists property must be included here too.
                exists: true,

                // Enrich the pool data with the data of the related accounts.
                data: {
                  ...existingPool.value.data,

                  // Mints
                  lpMint,
                  token0Mint,
                  token1Mint,

                  // Vaults
                  token0Vault,
                  token1Vault,

                  // Metaplex PDAs
                  token0MintMetaplexPda,
                  token1MintMetaplexPda,
                },
              },
            } satisfies SolanaRpcResponse<ExistingAccount<object, string>>;
          }
        )
      );
    }),

    // To prevent running the code inside switchMap each time a new subscriber is added,
    // and thereby creating the inner observables over and over again for each subscriber,
    // we need to share the observable at the end of this pipe.
    share()
  );
};
