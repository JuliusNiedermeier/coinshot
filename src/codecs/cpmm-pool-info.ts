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

export const cpmmPoolInfoDecoder = getStructDecoder([
  ["discriminator", fixDecoderSize(getBytesDecoder(), 8)], // blob(8) :contentReference[oaicite:4]{index=4}
  ["configId", getAddressDecoder()],
  ["poolCreator", getAddressDecoder()],
  ["vaultA", getAddressDecoder()],
  ["vaultB", getAddressDecoder()],

  ["mintLp", getAddressDecoder()],
  ["mintA", getAddressDecoder()],
  ["mintB", getAddressDecoder()],

  ["mintProgramA", getAddressDecoder()],
  ["mintProgramB", getAddressDecoder()],

  ["observationId", getAddressDecoder()],

  ["bump", getU8Decoder()],
  ["status", getU8Decoder()],

  ["lpDecimals", getU8Decoder()],
  ["mintDecimalA", getU8Decoder()],
  ["mintDecimalB", getU8Decoder()],

  ["lpAmount", getU64Decoder()],
  ["protocolFeesMintA", getU64Decoder()],
  ["protocolFeesMintB", getU64Decoder()],
  ["fundFeesMintA", getU64Decoder()],
  ["fundFeesMintB", getU64Decoder()],
  ["openTime", getU64Decoder()],

  ["seq", getArrayDecoder(getU64Decoder(), { size: 32 })], // seq(u64(), 32) :contentReference[oaicite:5]{index=5}
]);
