"use client";

import { formatEther } from "viem";
import { useEffect, useState } from "react";

interface VeNFTCardProps {
  listingId: number;
  collection: "veBTC" | "veMEZO";
  tokenId: bigint;
  price: bigint;
  paymentToken: string;
  intrinsicValue: bigint;
  lockEnd: bigint;
  votingPower: bigint;
  discountBps: bigint;
  seller: string;
  onBuy?: () => void;
}

export function VeNFTCard({
  listingId,
  collection,
  tokenId,
  price,
  paymentToken,
  intrinsicValue,
  lockEnd,
  votingPower,
  discountBps,
  seller,
  onBuy,
}: VeNFTCardProps) {
  const [timeRemaining, setTimeRemaining] = useState("");
  const [timerColor, setTimerColor] = useState("text-green-400");

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const end = Number(lockEnd);
      const remaining = end - now;

      if (remaining <= 0) {
        setTimeRemaining("Expired");
        setTimerColor("text-red-500");
        return;
      }

      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }

      // Color based on time remaining
      if (days > 14) {
        setTimerColor("text-green-400");
      } else if (days > 7) {
        setTimerColor("text-yellow-400");
      } else if (days > 1) {
        setTimerColor("text-orange-400");
      } else {
        setTimerColor("text-red-400");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lockEnd]);

  const discount = Number(discountBps) / 100;
  const formattedPrice = formatEther(price);
  const formattedIntrinsic = formatEther(intrinsicValue);
  const formattedVotingPower = formatEther(votingPower);

  const getPaymentSymbol = (token: string) => {
    const btc = "0x7b7c000000000000000000000000000000000000";
    const mezo = "0x7b7c000000000000000000000000000000000001";
    if (token.toLowerCase() === btc.toLowerCase()) return "BTC";
    if (token.toLowerCase() === mezo.toLowerCase()) return "MEZO";
    return "MUSD";
  };

  return (
    <div className="bg-mezo-secondary rounded-xl border border-gray-700 overflow-hidden hover:border-mezo-primary transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              collection === "veBTC"
                ? "bg-orange-500/20 text-orange-400"
                : "bg-purple-500/20 text-purple-400"
            }`}
          >
            {collection}
          </span>

          {discount > 0 && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
              -{discount.toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-gray-400 text-sm mt-2">#{tokenId.toString()}</p>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Locked Amount */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Locked</span>
          <span className="text-white font-medium">
            {parseFloat(formattedIntrinsic).toFixed(4)}{" "}
            {collection === "veBTC" ? "BTC" : "MEZO"}
          </span>
        </div>

        {/* Voting Power */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Voting Power</span>
          <span className="text-mezo-accent font-medium">
            {parseFloat(formattedVotingPower).toFixed(4)}
          </span>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Expires</span>
          <span className={`font-medium ${timerColor}`}>{timeRemaining}</span>
        </div>

        {/* Price */}
        <div className="pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Price</span>
            <span className="text-white font-bold text-lg">
              {parseFloat(formattedPrice).toFixed(4)} {getPaymentSymbol(paymentToken)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 pt-0">
        <button
          onClick={onBuy}
          className="w-full py-2 bg-mezo-primary text-black font-semibold rounded-lg hover:bg-mezo-primary/90 transition"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
