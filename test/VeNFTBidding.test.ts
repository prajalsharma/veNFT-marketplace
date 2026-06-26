import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

// These tests reproduce the *production* deployment configuration in which the
// PaymentRouter's one-time `marketplace` slot is bound to the VeNFTMarketplace
// contract — NOT to VeNFTBidding. Before the fix, acceptBid() routed payment
// through router.routePayment(), which is `onlyMarketplace`, so every accept
// reverted `Unauthorized` and the whole bidding feature was bricked on-chain.
//
// After the fix, acceptBid() reads the fee config from the router (calculateFee +
// feeRecipient, both public views) and moves the ERC-20 directly bidder→seller and
// bidder→treasury, so it settles correctly with no authorization dependency.

describe("VeNFTBidding", function () {
  const BTC_ADDRESS = "0x7b7C000000000000000000000000000000000000";

  const EMPTY_FILTER = {
    minIntrinsicValue: 0,
    maxIntrinsicValue: 0,
    maxLockDuration: 0,
    minVotingPower: 0,
    requireAutoMaxLock: false,
  };

  async function deployFixture() {
    const [deployer, admin, treasury, seller, bidder] = await ethers.getSigners();

    const MockVE = await ethers.getContractFactory("MockVotingEscrow");
    const veBTC = await MockVE.deploy("veBTC", "veBTC");
    const veMEZO = await MockVE.deploy("veMEZO", "veMEZO");
    await veBTC.waitForDeployment();
    await veMEZO.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const musd = await MockERC20.deploy("Mock MUSD", "MUSD", 18);
    await musd.waitForDeployment();

    const Router = await ethers.getContractFactory("PaymentRouter");
    const router = await Router.deploy(treasury.address, admin.address, await musd.getAddress(), 200); // 2%
    await router.waitForDeployment();

    const Admin = await ethers.getContractFactory("MarketplaceAdmin");
    const adminContract = await Admin.deploy(admin.address, true);
    await adminContract.waitForDeployment();

    const Adapter = await ethers.getContractFactory("MezoVeNFTAdapter");
    const adapter = await Adapter.deploy(await veBTC.getAddress(), await veMEZO.getAddress());
    await adapter.waitForDeployment();

    // Deploy the marketplace and bind the router's one-time marketplace slot to it,
    // exactly like the production deploy scripts do.
    const Marketplace = await ethers.getContractFactory("VeNFTMarketplace");
    const marketplace = await Marketplace.deploy(
      await adapter.getAddress(),
      await router.getAddress(),
      await adminContract.getAddress()
    );
    await marketplace.waitForDeployment();
    await router.connect(admin).setMarketplace(await marketplace.getAddress());

    // Bidding wired to the SAME router — which is NOT authorized for it.
    const Bidding = await ethers.getContractFactory("VeNFTBidding");
    const bidding = await Bidding.deploy(await router.getAddress(), await adminContract.getAddress());
    await bidding.waitForDeployment();

    // Seller owns a veBTC position.
    const lockAmount = ethers.parseEther("1");
    const lockEnd = (await time.latest()) + 28 * 24 * 60 * 60;
    const tokenId = await veBTC.createLock.staticCall(seller.address, lockAmount, lockEnd);
    await veBTC.createLock(seller.address, lockAmount, lockEnd);

    // Bidder funded with MUSD.
    await musd.mint(bidder.address, ethers.parseEther("1000"));

    return { veBTC, musd, router, marketplace, bidding, treasury, seller, bidder, tokenId };
  }

  it("settles an accepted MUSD bid even though the router is bound to the marketplace, not bidding", async function () {
    const { veBTC, musd, router, marketplace, bidding, treasury, seller, bidder, tokenId } =
      await loadFixture(deployFixture);

    // Precondition: the router authorizes the marketplace, not the bidding contract.
    expect(await router.marketplace()).to.equal(await marketplace.getAddress());
    expect(await router.marketplace()).to.not.equal(await bidding.getAddress());

    const amount = ethers.parseEther("100");
    const expiry = (await time.latest()) + 7 * 24 * 60 * 60;

    await musd.connect(bidder).approve(await bidding.getAddress(), amount);
    await bidding
      .connect(bidder)
      .createBid(await veBTC.getAddress(), tokenId, await musd.getAddress(), amount, expiry, EMPTY_FILTER, 0, 0, 0, 0, false);

    await veBTC.connect(seller).approve(await bidding.getAddress(), tokenId);

    const sellerBefore = await musd.balanceOf(seller.address);
    const treasuryBefore = await musd.balanceOf(treasury.address);

    await expect(bidding.connect(seller).acceptBid(0)).to.not.be.reverted;

    // NFT delivered to the bidder.
    expect(await veBTC.ownerOf(tokenId)).to.equal(bidder.address);

    // 2% fee split, identical to PaymentRouter's ERC-20 accounting.
    const fee = (amount * 200n) / 10000n;
    expect((await musd.balanceOf(seller.address)) - sellerBefore).to.equal(amount - fee);
    expect((await musd.balanceOf(treasury.address)) - treasuryBefore).to.equal(fee);

    // No funds stranded in the bidding contract.
    expect(await musd.balanceOf(await bidding.getAddress())).to.equal(0n);

    // Bid is no longer active.
    const bid = await bidding.bids(0);
    expect(bid.active).to.equal(false);
  });

  it("rejects native BTC as a bid currency (cannot be settled via the pull flow)", async function () {
    const { veBTC, bidding, bidder, tokenId } = await loadFixture(deployFixture);
    const expiry = (await time.latest()) + 7 * 24 * 60 * 60;
    await expect(
      bidding
        .connect(bidder)
        .createBid(await veBTC.getAddress(), tokenId, BTC_ADDRESS, ethers.parseEther("1"), expiry, EMPTY_FILTER, 0, 0, 0, 0, false)
    ).to.be.revertedWithCustomError(bidding, "UnsupportedPaymentToken");
  });
});
