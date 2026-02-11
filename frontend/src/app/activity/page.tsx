"use client";

import { useNetwork } from "@/hooks/useNetwork";

// Mock activity data
const MOCK_ACTIVITY = [
  {
    type: "sale",
    collection: "veBTC",
    tokenId: 5,
    price: "0.85",
    paymentToken: "BTC",
    from: "0x1234...5678",
    to: "0xabcd...ef01",
    timestamp: Date.now() - 3600000, // 1 hour ago
  },
  {
    type: "listed",
    collection: "veMEZO",
    tokenId: 12,
    price: "150",
    paymentToken: "MUSD",
    from: "0x2345...6789",
    to: null,
    timestamp: Date.now() - 7200000, // 2 hours ago
  },
  {
    type: "cancelled",
    collection: "veBTC",
    tokenId: 3,
    price: "0.5",
    paymentToken: "BTC",
    from: "0x3456...7890",
    to: null,
    timestamp: Date.now() - 14400000, // 4 hours ago
  },
  {
    type: "sale",
    collection: "veMEZO",
    tokenId: 8,
    price: "200",
    paymentToken: "MEZO",
    from: "0x4567...8901",
    to: "0xbcde...f012",
    timestamp: Date.now() - 28800000, // 8 hours ago
  },
];

function formatTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

export default function ActivityPage() {
  const { network, contracts } = useNetwork();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activity</h1>
        <p className="text-gray-400">
          Recent marketplace activity on Mezo{" "}
          {network === "testnet" ? "Testnet" : "Mainnet"}
        </p>
      </div>

      {/* Activity Table */}
      <div className="bg-mezo-secondary rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Event
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Item
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Price
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                From
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                To
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {MOCK_ACTIVITY.map((activity, index) => (
              <tr key={index} className="hover:bg-gray-800/30 transition">
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      activity.type === "sale"
                        ? "bg-green-500/20 text-green-400"
                        : activity.type === "listed"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {activity.type.charAt(0).toUpperCase() +
                      activity.type.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activity.collection === "veBTC"
                          ? "bg-orange-500"
                          : "bg-purple-500"
                      }`}
                    />
                    <span className="text-white">
                      {activity.collection} #{activity.tokenId}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-white font-medium">
                  {activity.price} {activity.paymentToken}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`${contracts.explorer}/address/${activity.from}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mezo-accent hover:underline"
                  >
                    {activity.from}
                  </a>
                </td>
                <td className="px-6 py-4">
                  {activity.to ? (
                    <a
                      href={`${contracts.explorer}/address/${activity.to}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mezo-accent hover:underline"
                    >
                      {activity.to}
                    </a>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {formatTime(activity.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note */}
      <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-400 text-sm">
          <strong>Note:</strong> This is displaying mock data. Connect to a
          deployed marketplace to see real activity.
        </p>
      </div>
    </div>
  );
}
