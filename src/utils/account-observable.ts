import { defaultCommitment, limiter, rpc, rpcSubscriptions } from "../config";
import { defer, from, map, merge, share, takeUntil } from "rxjs";
import { Address, EncodedAccount, Account, Commitment, MaybeAccount, SolanaRpcResponse } from "@solana/kit";
import { convertAccountInfoToAccount } from "./account";
import { createRpcSubscriptionObservable } from "./subscription-observable";

export interface CreateAccountObservableConfig<TDecodedData extends object, TAddress extends string = string> {
  address: Address<TAddress>;
  commitment?: Commitment;
  decode: (encodedAccount: EncodedAccount) => Account<TDecodedData, TAddress>;
}

export const createAccountObservable = <TData extends object, TAddress extends string = string>(
  config: CreateAccountObservableConfig<TData, TAddress>
) => {
  const commitment = config.commitment || defaultCommitment;

  const subscriptionData = createRpcSubscriptionObservable((abortSignal) =>
    limiter.schedule(() =>
      rpcSubscriptions
        .accountNotifications(config.address, { commitment, encoding: "base64" })
        .subscribe({ abortSignal })
    )
  );

  // Using getAccountInfo here becuase fetchEncodedAccount strips the slot value.
  // Using type assertion here, because typescript does not pick up the check for accountInfo.value correctly by itself.
  const initialData = defer(() =>
    from(limiter.schedule(() => rpc.getAccountInfo(config.address, { commitment, encoding: "base64" }).send()))
  ).pipe(
    takeUntil(subscriptionData)

    // TODO: Instead of preventing initialData from emitting, by filtering out account emissions that dont have a value,
    // initialData should actually always emit a MaybeAccount or Account | null, as soon as the promis resolves.
    // filter((accountInfo) => Boolean(accountInfo.value))
  ); //as Observable<SolanaRpcResponse<AccountInfoBase & AccountInfoWithBase64EncodedData>>;

  // TODO:
  // There is a brief moment between recieving the initial data and the ws connection not being ready,
  // where on-chain account changes could be missed. It would be better to only start fetching initial data
  // once the ws connection stands, or in this case once accountNotifications().subscribe() resolves and returns an iterator.
  return merge(initialData, subscriptionData).pipe(
    // Decode the account.
    // Keep the slot for temporal synchronization with other account observables
    map((accountNotification) => {
      if (!accountNotification.value) {
        return {
          context: accountNotification.context,
          value: { exists: false, address: config.address },
        } satisfies SolanaRpcResponse<MaybeAccount<TData, TAddress>>;
      }

      const account = convertAccountInfoToAccount({
        pubkey: config.address,
        account: { ...accountNotification.value, data: Buffer.from(...accountNotification.value.data) },
      });

      const decodedAccount = config.decode(account);

      return {
        context: accountNotification.context,
        value: { exists: true, ...decodedAccount },
      } satisfies SolanaRpcResponse<MaybeAccount<TData, TAddress>>;
    }),

    // Prevents refetching initial data when a second subscriber subscribes to this pipe
    share()
  );
};
