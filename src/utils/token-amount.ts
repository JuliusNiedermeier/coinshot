import { Big } from "big.js";

type TokenAmountInputBase = { decimals: number };
type TokenAmountBaseInput = TokenAmountInputBase & { base: bigint };
type TokenAmountDisplayInput = TokenAmountInputBase & { display: bigint | Big };
type TokenAmountInput = TokenAmountBaseInput | TokenAmountDisplayInput;

export type TokenAmount = { base: Big; display: Big; decimals: number };

export const tokenAmount = ({ decimals, ...amount }: TokenAmountInput): TokenAmount => {
  const factor = new Big(10).pow(decimals);
  if ("base" in amount) {
    const base = new Big(amount.base.toString());
    return { decimals, base, display: base.div(factor) };
  } else {
    const display = new Big(amount.display.toString());
    return { decimals, base: display.mul(factor), display };
  }
};
