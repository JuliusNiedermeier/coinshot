import {
  fixDecoderSize,
  getAddressDecoder,
  getArrayDecoder,
  getBytesDecoder,
  getStructDecoder,
  getU64Decoder,
  getU8Decoder,
} from "@solana/kit";

// Taken from: https://github.com/raydium-io/raydium-sdk-V2/blob/36f5c709c09906ea083659057112c6121217c65b/src/raydium/cpmm/layout.ts#L18
// Docs on solana kit codecs here: https://solana-kit-docs.vercel.app/docs/concepts/codecs
// This was ai generated using ChatGPT 4o with search and reasoning enabled using the following prompt:

// I am building a solana trading bot and am using the new @solana/kit library that is the successor to @solana/web3.js. Also I am using the package @raydium-io/raydium-sdk-v2 to decode CPMM pool account data using CpmmPoolInfoLayout.decode(). However, Raydium uses buffer-layout under the hood and decodes the data in a way that is not compatible with the new solana kit. Solana kit uses different types for PublicKey or bigins and so on.
// So please convert this CpmmPoolInfoLayout from the Raydium package, to the new format @solana/kit uses. You can get the docs for the new method here: https://solana-kit-docs.vercel.app/docs/concepts/codecs
// <Pasted the old Layout from raydium here>

// Names adjusted based on program rust source code at:
// https://github.com/raydium-io/raydium-cp-swap/blob/183ddbb11550cea212710a98351779a41873258b/programs/cp-swap/src/states/pool.rs#L26

export const cpmmPoolInfoDecoder = getStructDecoder([
  ["discriminator", fixDecoderSize(getBytesDecoder(), 8)], // blob(8) :contentReference[oaicite:4]{index=4}

  ["ammConfig", getAddressDecoder()],
  ["poolCreator", getAddressDecoder()],
  ["token0Vault", getAddressDecoder()],
  ["token1Vault", getAddressDecoder()],

  ["lpMint", getAddressDecoder()],
  ["token0Mint", getAddressDecoder()],
  ["token1Mint", getAddressDecoder()],

  ["token0Program", getAddressDecoder()],
  ["token1Program", getAddressDecoder()],

  ["observationKey", getAddressDecoder()],

  ["authBump", getU8Decoder()],
  ["status", getU8Decoder()],

  ["lpMintDecimals", getU8Decoder()],
  ["mint0Decimals", getU8Decoder()],
  ["mint1Decimals", getU8Decoder()],

  ["lpSupply", getU64Decoder()],
  ["protocolFeesToken0", getU64Decoder()],
  ["protocolFeesToken1", getU64Decoder()],
  ["fundFeesToken0", getU64Decoder()],
  ["fundFeesToken1", getU64Decoder()],
  ["openTime", getU64Decoder()],
  ["recentEpoch", getU64Decoder()],

  ["seq", getArrayDecoder(getU64Decoder(), { size: 31 })],
]);

export type CpmmPoolInfo = ReturnType<(typeof cpmmPoolInfoDecoder)["decode"]>;
