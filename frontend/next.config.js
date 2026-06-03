/** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    transpilePackages: [
      "@mezo-org/passport",
      "@mezo-org/orangekit",
      "@mezo-org/orangekit-contracts",
      "@mezo-org/orangekit-smart-account",
      "@mezo-org/mezo-clay",
      "@mezo-org/mezod-contracts",
      "@mezo-org/musd-contracts",
      "@mezo-org/sign-in-with-wallet",
      "@mezo-org/sign-in-with-wallet-parser"
    ],
    typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // Wallet libs (WalletConnect, RainbowKit, viem) use eval internally.
            // 'unsafe-eval' is required or they silently break.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
    webpack: (config) => {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@react-native-async-storage/async-storage": false,
        "bech32": require.resolve("bech32"),
      };
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
      config.externals.push("pino-pretty", "lokijs", "encoding");
      return config;
    },
};

module.exports = nextConfig;
