import {
  AccountInfoBase,
  AccountInfoWithPubkey,
  Address,
  Base64EncodedDataResponse,
  SolanaRpcResponse,
  EncodedAccount,
  Account,
  MaybeAccount,
} from "@solana/kit";

// These are all possible data encodings returned by solana rpc subscriptions.
// To not overcomplicate these convert utils, base64 encoding is expected for now.
type EncodedDataResponse = Base64EncodedDataResponse;
// | Base64EncodedZStdCompressedDataResponse
// | AccountInfoWithJsonData["data"]
// | Base58EncodedDataResponse;

// The way this is types is inpired by the ProgramNotificationsApi type from @solana/kit
type ProgramNotificationsApiNotificationBase<TDataResponse extends EncodedDataResponse> = SolanaRpcResponse<
  AccountInfoWithPubkey<AccountInfoBase & { data: TDataResponse }>
>;

// The way this is types is inpired by the AccountNotificationsApi type from @solana/kit
type AccountNotificationsApiNotificationBase<TDataResponse extends EncodedDataResponse> = SolanaRpcResponse<
  AccountInfoBase & { data: TDataResponse }
>;

// Not realy used anymore
export const convertProgramNotificationToEncodedAccount = <TAddress extends string = string>(
  programNotification: ProgramNotificationsApiNotificationBase<Base64EncodedDataResponse>
): EncodedAccount<TAddress> => {
  const { owner, data, ...restAccount } = programNotification.value.account;
  return {
    address: programNotification.value.pubkey as Address<TAddress>,
    programAddress: owner,
    data: Buffer.from(...data),
    ...restAccount,
  };
};

// Not really used anymore
export const convertAccountNotificationToAccount = <TAddress extends string = string>(
  address: Address<TAddress>,
  accountNotification: AccountNotificationsApiNotificationBase<Base64EncodedDataResponse>
): EncodedAccount<TAddress> => {
  return convertProgramNotificationToEncodedAccount({
    context: accountNotification.context,
    value: { pubkey: address, account: accountNotification.value },
  });
};

export const convertAccountInfoToAccount = <TData extends Uint8Array | object, TAddress extends string = string>(
  accountInfo: AccountInfoWithPubkey<AccountInfoBase & { data: TData }>
): Account<TData, TAddress> => {
  const { owner, ...restAccount } = accountInfo.account;
  return { address: accountInfo.pubkey as Address<TAddress>, programAddress: owner, ...restAccount };
};

/**
 * Takes a MaybeAccount and returns an Account if it exists or null if it doesn't exist.
 * This helps accessing MaybeAccount data inline using optional chaining.
 * 
 * Example: toExistingAccount(maybeAccount)?.data
 * */
export const toExistingAccount = <TData extends Uint8Array | object, TAddress extends string = string>(
  maybeAccount: MaybeAccount<TData, TAddress>
) => {
  if (!maybeAccount.exists) return null;
  const { exists, ...account } = maybeAccount;
  return account satisfies Account<TData, TAddress>;
};

/**
 * Casts a MaybeAccount to an Account.
 * This is only safe to use, if MaybeAccount has previously been checked to exist.
 * */
export const asExistingAccount = <TData extends Uint8Array | object, TAddress extends string = string>(
  maybeAccount: MaybeAccount<TData, TAddress>
) => {
  const { exists, ...account } = maybeAccount;
  return account as Account<TData, TAddress>;
};
