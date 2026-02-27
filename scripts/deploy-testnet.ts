import { ethers } from "hardhat";

// Testnet contract addresses
const VEBTC_TESTNET = "0x38E35d92E6Bfc6787272A62345856B13eA12130a";
const VEMEZO_TESTNET = "0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b";
const MUSD_TESTNET = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BTC");

  // Get admin/treasury from env or use deployer
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const initialFeeBps = parseInt(process.env.PROTOCOL_FEE_BPS || "100"); // 1%

  console.log("\n--- Deployment Configuration ---");
  console.log("Network: Mezo Testnet (31611)");
  console.log("Fee Recipient:", feeRecipient);
  console.log("Admin Address:", adminAddress);
  console.log("Initial Fee:", initialFeeBps, "bps");
  console.log("veBTC:", VEBTC_TESTNET);
  console.log("veMEZO:", VEMEZO_TESTNET);
  console.log("MUSD:", MUSD_TESTNET);

  // 1. Deploy MezoVeNFTAdapter
  console.log("\n1. Deploying MezoVeNFTAdapter...");
  const Adapter = await ethers.getContractFactory("MezoVeNFTAdapter");
  const adapter = await Adapter.deploy(VEBTC_TESTNET, VEMEZO_TESTNET);
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("   MezoVeNFTAdapter deployed to:", adapterAddress);

  // 2. Deploy PaymentRouter
  console.log("\n2. Deploying PaymentRouter...");
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const router = await PaymentRouter.deploy(
    feeRecipient,
    adminAddress,
    MUSD_TESTNET,
    initialFeeBps
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("   PaymentRouter deployed to:", routerAddress);

  // 3. Deploy MarketplaceAdmin
  console.log("\n3. Deploying MarketplaceAdmin...");
  const Admin = await ethers.getContractFactory("MarketplaceAdmin");
  const admin = await Admin.deploy(adminAddress, true); // true = testnet
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

  // 5. Configure MarketplaceAdmin with PaymentRouter
  console.log("\n5. Configuring MarketplaceAdmin...");
  await admin.setPaymentRouter(routerAddress);
  console.log("   PaymentRouter set in MarketplaceAdmin");

  // Output deployment summary
  console.log("\n=== TESTNET DEPLOYMENT COMPLETE ===");
  console.log("Network: Mezo Testnet (Chain ID: 31611)");
  console.log("Explorer: https://explorer.test.mezo.org");
  console.log("");
  console.log("Contract Addresses:");
  console.log("-------------------");
  console.log("MezoVeNFTAdapter:", adapterAddress);
  console.log("PaymentRouter:   ", routerAddress);
  console.log("MarketplaceAdmin:", adminContractAddress);
  console.log("VeNFTMarketplace:", marketplaceAddress);
  console.log("");
  console.log("Verify contracts:");
  console.log(`npx hardhat verify --network mezotestnet ${adapterAddress} ${VEBTC_TESTNET} ${VEMEZO_TESTNET}`);
  console.log(`npx hardhat verify --network mezotestnet ${routerAddress} ${feeRecipient} ${adminAddress} ${MUSD_TESTNET} ${initialFeeBps}`);
  console.log(`npx hardhat verify --network mezotestnet ${adminContractAddress} ${adminAddress} true`);
  console.log(`npx hardhat verify --network mezotestnet ${marketplaceAddress} ${adapterAddress} ${routerAddress} ${adminContractAddress}`);

  // Save deployment info
  const fs = await import("fs");
  const deploymentInfo = {
    network: "mezotestnet",
    chainId: 31611,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MezoVeNFTAdapter: adapterAddress,
      PaymentRouter: routerAddress,
      MarketplaceAdmin: adminContractAddress,
      VeNFTMarketplace: marketplaceAddress,
    },
    config: {
      veBTC: VEBTC_TESTNET,
      veMEZO: VEMEZO_TESTNET,
      MUSD: MUSD_TESTNET,
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
    `${deploymentsDir}/testnet.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployments/testnet.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
