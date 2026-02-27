import { ethers } from "hardhat";

// Mainnet contract addresses
const VEBTC_MAINNET = "0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279";
const VEMEZO_MAINNET = "0xb90fdAd3DFD180458D62Cc6acedc983D78E20122";
const MUSD_MAINNET = "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BTC");

  // Require explicit configuration for mainnet
  if (!process.env.FEE_RECIPIENT || !process.env.ADMIN_ADDRESS) {
    throw new Error("MAINNET DEPLOY: FEE_RECIPIENT and ADMIN_ADDRESS must be set in env");
  }

  const feeRecipient = process.env.FEE_RECIPIENT;
  const adminAddress = process.env.ADMIN_ADDRESS;
  const initialFeeBps = parseInt(process.env.PROTOCOL_FEE_BPS || "100");

  console.log("\n=== MAINNET DEPLOYMENT ===");
  console.log("WARNING: This is a mainnet deployment!");
  console.log("Network: Mezo Mainnet (31612)");
  console.log("Fee Recipient:", feeRecipient);
  console.log("Admin Address:", adminAddress);
  console.log("Initial Fee:", initialFeeBps, "bps (", initialFeeBps / 100, "%)");
  console.log("veBTC:", VEBTC_MAINNET);
  console.log("veMEZO:", VEMEZO_MAINNET);
  console.log("MUSD:", MUSD_MAINNET);

  // Safety check
  console.log("\nProceeding with deployment in 5 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 1. Deploy MezoVeNFTAdapter
  console.log("\n1. Deploying MezoVeNFTAdapter...");
  const Adapter = await ethers.getContractFactory("MezoVeNFTAdapter");
  const adapter = await Adapter.deploy(VEBTC_MAINNET, VEMEZO_MAINNET);
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("   MezoVeNFTAdapter deployed to:", adapterAddress);

  // 2. Deploy PaymentRouter
  console.log("\n2. Deploying PaymentRouter...");
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const router = await PaymentRouter.deploy(
    feeRecipient,
    adminAddress,
    MUSD_MAINNET,
    initialFeeBps
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("   PaymentRouter deployed to:", routerAddress);

  // 3. Deploy MarketplaceAdmin
  console.log("\n3. Deploying MarketplaceAdmin...");
  const Admin = await ethers.getContractFactory("MarketplaceAdmin");
  const admin = await Admin.deploy(adminAddress, false); // false = mainnet
  await admin.waitForDeployment();
  const adminContractAddress = await admin.getAddress();
  console.log("   MarketplaceAdmin deployed to:", adminContractAddress);

  // 4. Deploy VeNFTMarketplace
  console.log("\n4. Deploying VeNFTMarketplace...");
  const Marketplace = await ethers.getContractFactory("VeNFTMarketplace");
  const marketplace = await Marketplace.deploy(
    adapterAddress,
    routerAddress,
    adminContractAddress
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("   VeNFTMarketplace deployed to:", marketplaceAddress);

  // 5. Configure MarketplaceAdmin
  console.log("\n5. Configuring MarketplaceAdmin...");
  await admin.setPaymentRouter(routerAddress);
  console.log("   PaymentRouter set in MarketplaceAdmin");

  // Output deployment summary
  console.log("\n=== MAINNET DEPLOYMENT COMPLETE ===");
  console.log("Network: Mezo Mainnet (Chain ID: 31612)");
  console.log("Explorer: https://explorer.mezo.org");
  console.log("");
  console.log("Contract Addresses:");
  console.log("-------------------");
  console.log("MezoVeNFTAdapter:", adapterAddress);
  console.log("PaymentRouter:   ", routerAddress);
  console.log("MarketplaceAdmin:", adminContractAddress);
  console.log("VeNFTMarketplace:", marketplaceAddress);

  // Save deployment info
  const fs = await import("fs");
  const deploymentInfo = {
    network: "mezomainnet",
    chainId: 31612,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MezoVeNFTAdapter: adapterAddress,
      PaymentRouter: routerAddress,
      MarketplaceAdmin: adminContractAddress,
      VeNFTMarketplace: marketplaceAddress,
    },
    config: {
      veBTC: VEBTC_MAINNET,
      veMEZO: VEMEZO_MAINNET,
      MUSD: MUSD_MAINNET,
      feeRecipient,
      adminAddress,
      initialFeeBps,
    },
  };

  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    `${deploymentsDir}/mainnet.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployments/mainnet.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
