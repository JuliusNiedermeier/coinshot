import { from, mergeMap, Observable, share } from "rxjs";

export const createRpcSubscriptionObservable = <T extends AsyncIterable<unknown>>(
  init: (abortSignal: AbortSignal) => Promise<T>
) => {
  return new Observable<T>((subscriber) => {
    const abortController = new AbortController();

    init(abortController.signal)
      .then((asyncIterable) => subscriber.next(asyncIterable))
      .catch((err) => subscriber.error(err));

    return () => abortController.abort();
  }).pipe(
    // Flatten the async iterable of account updates into a stream of individual updates.
    // Initially, the observable emits a single async iterable once the RPC subscription resolves.
    // This mergeMap consumes the async iterable and emits each account update as a separate value.
    mergeMap((asyncIterable) => from(asyncIterable)),

    // Convert the cold observable into a hot observable.
    // Without this, each new subscriber would trigger a new underlying network connection.
    // Sharing the subscription ensures a single connection is reused across all subscribers.
    share()
  );
};
