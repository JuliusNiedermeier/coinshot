import "dotenv/config";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { Connection, Keypair } from "@solana/web3.js";
import { getHeliusEndpoints } from "helius-sdk";
import { mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSolanaRpc, createSolanaRpcSubscriptions, Commitment } from "@solana/kit";
import Bottleneck from "bottleneck";

// Solana RPC cluster connection
const heliusEndpoints = getHeliusEndpoints("mainnet-beta");
const heliusRpcHttpEndpoint = new URL(`${heliusEndpoints.rpc}/?api-key=${process.env.HELIUS_API_KEY}`);
const heliusRpcWsEndpoint = new URL(heliusRpcHttpEndpoint);
heliusRpcWsEndpoint.protocol = "wss";

export const connection = new Connection(heliusRpcHttpEndpoint.toString(), { commitment: "confirmed" });
export const rpc = createSolanaRpc(heliusRpcHttpEndpoint.toString());
export const rpcSubscriptions = createSolanaRpcSubscriptions(heliusRpcWsEndpoint.toString());

// Wallet
const walletSeedBuffer = mnemonicToSeedSync(process.env.WALLET_SEED_PHRASE!);
const derivedWalletSeedBuffer = derivePath("m/44'/501'/0'/0'", walletSeedBuffer.toString("hex")).key;
export const walletKeypair = Keypair.fromSeed(derivedWalletSeedBuffer);

// Raydium SDK
const raydiumPromise = Raydium.load({
  owner: walletKeypair,
  connection,
  cluster: "mainnet",
  disableFeatureCheck: true,
  blockhashCommitment: connection.commitment,
});

export const getRaydium = () => raydiumPromise;

export const umi = createUmi(connection);

export const defaultCommitment = "confirmed" satisfies Commitment;

export const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 100, // 10 req/sec
});
