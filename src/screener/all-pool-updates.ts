import { fromLegacyPublicKey } from "@solana/compat";
import { defaultCommitment, limiter, rpcSubscriptions } from "../config";
import { convertProgramNotificationToEncodedAccount, createRpcSubscriptionObservable } from "../utils";
import { CREATE_CPMM_POOL_PROGRAM } from "@raydium-io/raydium-sdk-v2";
import { cpmmPoolInfoDecoder } from "../codecs/cpmm-pool-info";
import { map } from "rxjs";
import { decodeAccount } from "@solana/kit";

export const allPoolUpdates = createRpcSubscriptionObservable((abortSignal) => {
  return limiter.schedule(() =>
    rpcSubscriptions
      .programNotifications(fromLegacyPublicKey(CREATE_CPMM_POOL_PROGRAM), {
        commitment: defaultCommitment,
        encoding: "base64",
        filters: [{ dataSize: BigInt(cpmmPoolInfoDecoder.fixedSize) }],
      })
      .subscribe({ abortSignal })
  );
}).pipe(
  // Decode the pool account data
  map((programNotification) => {
    const account = convertProgramNotificationToEncodedAccount(programNotification);
    return decodeAccount(account, cpmmPoolInfoDecoder);
  })
);
