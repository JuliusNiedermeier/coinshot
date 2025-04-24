import { getMetadataAccountDataSerializer, MetadataAccountData } from "@metaplex-foundation/mpl-token-metadata";
import { Account, EncodedAccount } from "@solana/kit";

export const decodeMetaplexMetadataAccount = <TAddress extends string = string>(account: EncodedAccount<TAddress>) => {
  return {
    ...account,
    data: getMetadataAccountDataSerializer().deserialize(Buffer.from(account.data))[0],
  } satisfies Account<MetadataAccountData, TAddress>;
};
