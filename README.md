# Credits

https://github.com/warp-id/solana-trading-bot/blob/master/listeners/listeners.ts

# Known Issues

## Deprecation Warning: DeprecationWarning: The 'punycode' module is deprecated.

This warning is caused by the use of `tr46` versions older than `v4.0.0`.  
Prior to `v4.0.0`, `tr46` directly imported Node.js's native `punycode` module, which is now deprecated. Starting from `v4.0.0`, `tr46` properly imports `punycode/` from userland to avoid this warning.

- The relevant release: [tr46 v4.0.0](https://github.com/jsdom/tr46/releases/tag/v4.0.0)
- The actual change: [Commit fef6e95](https://github.com/jsdom/tr46/commit/fef6e95)

### Dependency Chain Leading to the Warning

- `whatwg-url` has used `tr46 >= v4.0.0` since `v12.0.1`.
- node-fetch used `whatwg-url` up until `v2.6.x`, but completely removed it starting with `v3.0.0`.

### Current Issue

- `@metaplex-foundation/umi-http-fetch` (used by `@metaplex-foundation/umi-bundle-defaults`) depends on `node-fetch@2.7.0`.
- `@solana/web3.js` also depends on `node-fetch@2.7.0`.

As a result, importing either `@metaplex-foundation/umi-bundle-defaults` or `@solana/web3.js` will trigger the `punycode` deprecation warning.
