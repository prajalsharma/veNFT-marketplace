// Ecosystem partners, shared by the home page section and /partners.
//
// Every claim about a partner is checked against its own docs (linked below)
// and stays inside what they say: no yields, no "safe", no "instant". Aurove
// facts verified 4 Nov 2026 against aurove.xyz/docs and on-chain reads.

export const AUROVE = {
  name: "Aurove",
  href: "https://www.aurove.xyz",
  docs: "https://www.aurove.xyz/docs",
  earn: "https://www.aurove.xyz/earn",
  x: "https://x.com/aurove_xyz",
  logo: "/partners/aurove.webp",
  logoRatio: 640 / 187,
  // Their own words, quoted as such on the page.
  tagline: "The liquid ve-yield layer for Mezo Earn.",
  summary:
    "Aurove takes a veBTC or veMEZO position and keeps it earning in Mezo Earn, while you hold avBTCm or avMEZOm, a token you can move, swap or add to a pool.",
  // How a Vezo user puts Aurove to work. Short, plain, accurate to their docs.
  uses: [
    {
      title: "Keep earning instead of selling",
      body: "Need liquidity but don't want to give up your lock? Deposit your veBTC or veMEZO on Aurove. It stays in Mezo Earn, and you get avBTCm or avMEZOm for the full locked amount.",
    },
    {
      title: "Put a Vezo buy to work",
      body: "Bought a lock below its value on Vezo? Deposit it on Aurove and receive tokens for everything it holds, not for what you paid.",
    },
    {
      title: "Turn it back into a veNFT later",
      body: "Redeem on Aurove to get a veNFT back. Mezo's epoch timing still applies, so check when rewards land before you redeem.",
    },
  ],
  steps: [
    "Hold a veBTC or veMEZO, or buy one on the Vezo marketplace.",
    "Open Earn on Aurove and choose to deposit an existing position.",
    "Receive avBTCm or avMEZOm. Hold it, swap it, or add it to a pool on Aurove.",
  ],
  // Things a user should know before depositing. Each comes from Aurove's docs.
  notes: [
    "Aurove is a separate protocol with its own contracts, which its team can upgrade. Read their docs before depositing.",
    "Redeeming gives you a veNFT back, not BTC or MEZO. Leaving before an epoch closes can forfeit that epoch's rewards.",
    "Aurove's pools are new, so large swaps can move the price a lot.",
    "Grant positions that are still vesting can't be deposited.",
    "Aurove takes a fee from rewards. Their docs explain how.",
  ],
} as const;
