"use client";

// The protocol fee, read from the PaymentRouter: the contract the sale
// actually settles through. The admin can change the rate (behind a 48-hour
// timelock, capped at 5%), so it is never hardcoded in the UI.

import { useReadContract } from "wagmi";
import { useNetwork } from "@/hooks/useNetwork";

export const ROUTER_FEE_ABI = [
  {
    name: "calculateFee",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [{ name: "fee", type: "uint256" }, { name: "sellerAmount", type: "uint256" }],
  },
] as const;

const PROBE = 10n ** 22n; // 10,000 units: enough precision to read the rate

/** Fee for a specific amount (exact, as the contract computes it), plus the rate. */
export function useProtocolFee(amount?: bigint) {
  const { contracts, chainId } = useNetwork();
  const router = contracts.router as `0x${string}`;
  const enabled = !!router && !/^0x0{40}$/i.test(router);

  const rateRead = useReadContract({ address: router, abi: ROUTER_FEE_ABI, functionName: "calculateFee", args: [PROBE], chainId, query: { enabled, staleTime: 5 * 60_000 } });
  const feeRead = useReadContract({
    address: router,
    abi: ROUTER_FEE_ABI,
    functionName: "calculateFee",
    args: amount !== undefined ? [amount] : undefined,
    chainId,
    query: { enabled: enabled && amount !== undefined, staleTime: 5 * 60_000 },
  });

  const rate = rateRead.data ? Number(rateRead.data[0]) / Number(PROBE) : null;
  return {
    /** Fraction, e.g. 0.01 for 1%. null until read. */
    rate,
    /** "1%" style label, null until read. */
    rateLabel: rate !== null ? `${+(rate * 100).toFixed(2)}%` : null,
    /** Exact fee in wei for `amount`, null until read. */
    fee: feeRead.data ? feeRead.data[0] : null,
    /** What the seller receives for `amount`, null until read. */
    sellerAmount: feeRead.data ? feeRead.data[1] : null,
    isError: rateRead.isError || feeRead.isError,
  };
}
