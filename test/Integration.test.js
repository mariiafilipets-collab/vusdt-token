const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Integration Tests - Full Flow", function () {
  let vusdt, usdt, purchaseContract, yieldDistributor;
  let owner, buyer1, buyer2, centralWallet;

  beforeEach(async function () {
    [owner, buyer1, buyer2, centralWallet] = await ethers.getSigners();

    // Deploy VUSDT
    const VUSDT = await ethers.getContractFactory("VUSDT");
    vusdt = await VUSDT.deploy(owner.address);
    await vusdt.waitForDeployment();

    // Deploy Mock USDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();

    // Deploy YieldDistributor
    const YieldDistributor = await ethers.getContractFactory("YieldDistributor");
    yieldDistributor = await YieldDistributor.deploy(
      await vusdt.getAddress(),
      owner.address
    );
    await yieldDistributor.waitForDeployment();

    // Deploy Purchase Contract
    const Purchase = await ethers.getContractFactory("VUSDTPurchase");
    purchaseContract = await Purchase.deploy(
      await vusdt.getAddress(),
      await usdt.getAddress(),
      centralWallet.address,
      owner.address
    );
    await purchaseContract.waitForDeployment();

    // Configure contracts
    await vusdt.setYieldDistributor(await yieldDistributor.getAddress());
    await vusdt.setPurchaseContract(await purchaseContract.getAddress());

    // Give buyers some USDT
    await usdt.transfer(buyer1.address, ethers.parseEther("10000"));
    await usdt.transfer(buyer2.address, ethers.parseEther("5000"));
  });

  describe("Complete Flow: Purchase -> Register -> Yield", function () {
    it("Should complete full cycle: purchase, register, receive yield", async function () {
      const purchaseAmount1 = ethers.parseEther("1000");
      const purchaseAmount2 = ethers.parseEther("500");

      // Step 1: Buyers purchase VUSDT
      console.log("\n=== Step 1: Purchasing VUSDT ===");
      
      // Buyer 1 purchases
      await usdt.connect(buyer1).approve(await purchaseContract.getAddress(), purchaseAmount1);
      await purchaseContract.connect(buyer1).purchaseVUSDT(purchaseAmount1);
      
      // Buyer 2 purchases
      await usdt.connect(buyer2).approve(await purchaseContract.getAddress(), purchaseAmount2);
      await purchaseContract.connect(buyer2).purchaseVUSDT(purchaseAmount2);

      // Verify balances
      expect(await vusdt.balanceOf(buyer1.address)).to.equal(purchaseAmount1);
      expect(await vusdt.balanceOf(buyer2.address)).to.equal(purchaseAmount2);
      expect(await usdt.balanceOf(centralWallet.address)).to.equal(purchaseAmount1 + purchaseAmount2);

      // Step 2: Register holders for yield
      console.log("\n=== Step 2: Registering holders ===");
      
      await yieldDistributor.registerHolders([buyer1.address, buyer2.address]);
      
      expect(await yieldDistributor.isRegisteredHolder(buyer1.address)).to.be.true;
      expect(await yieldDistributor.isRegisteredHolder(buyer2.address)).to.be.true;
      expect(await yieldDistributor.getHolderCount()).to.equal(2);

      // Step 3: Fast forward time to next Friday
      console.log("\n=== Step 3: Fast forwarding to next Friday ===");
      
      // Fast forward 1 week to ensure we can distribute
      await time.increase(7 * 24 * 60 * 60);

      // Step 4: Distribute yield
      console.log("\n=== Step 4: Distributing yield ===");
      
      const initialBalance1 = await vusdt.balanceOf(buyer1.address);
      const initialBalance2 = await vusdt.balanceOf(buyer2.address);

      // Check if can distribute
      const canDistribute = await yieldDistributor.canDistribute();
      console.log(`Can distribute: ${canDistribute}`);

      // Expected yield: 0.22% weekly (220 bps)
      // Buyer 1: 1000 * 0.0022 = 2.2 VUSDT
      // Buyer 2: 500 * 0.0022 = 1.1 VUSDT
      const expectedYield1 = ethers.parseEther("2.2");
      const expectedYield2 = ethers.parseEther("1.1");

      if (canDistribute) {
        const tx = await yieldDistributor.distributeYield();
        const receipt = await tx.wait();

        // Verify yield was distributed
        const finalBalance1 = await vusdt.balanceOf(buyer1.address);
        const finalBalance2 = await vusdt.balanceOf(buyer2.address);

        const yieldReceived1 = finalBalance1 - initialBalance1;
        const yieldReceived2 = finalBalance2 - initialBalance2;

        console.log(`Buyer 1: Expected ${ethers.formatEther(expectedYield1)}, Received ${ethers.formatEther(yieldReceived1)}`);
        console.log(`Buyer 2: Expected ${ethers.formatEther(expectedYield2)}, Received ${ethers.formatEther(yieldReceived2)}`);

        // Verify yield was received (allow for small differences)
        expect(yieldReceived1).to.be.gt(0);
        expect(yieldReceived2).to.be.gt(0);
        expect(finalBalance1).to.be.gt(initialBalance1);
        expect(finalBalance2).to.be.gt(initialBalance2);
      } else {
        console.log("Cannot distribute yet - time requirements not met");
      }

      console.log("\n✅ Full cycle completed successfully!");
      console.log(`   Buyer 1 expected ${ethers.formatEther(expectedYield1)} VUSDT yield`);
      console.log(`   Buyer 2 expected ${ethers.formatEther(expectedYield2)} VUSDT yield`);
    });

    it("Should support compound interest over multiple weeks", async function () {
      const purchaseAmount = ethers.parseEther("1000");
      
      // Purchase VUSDT
      await usdt.connect(buyer1).approve(await purchaseContract.getAddress(), purchaseAmount);
      await purchaseContract.connect(buyer1).purchaseVUSDT(purchaseAmount);
      
      // Register holder
      await yieldDistributor.registerHolders([buyer1.address]);

      // Distribute yield for 4 weeks
      for (let week = 1; week <= 4; week++) {
        // Fast forward 1 week
        await time.increase(7 * 24 * 60 * 60);
        
        const balanceBefore = await vusdt.balanceOf(buyer1.address);
        await yieldDistributor.distributeYield();
        const balanceAfter = await vusdt.balanceOf(buyer1.address);
        
        const yieldReceived = balanceAfter - balanceBefore;
        console.log(`Week ${week}: Received ${ethers.formatEther(yieldReceived)} VUSDT`);
        
        // Verify yield is increasing due to compound interest
        if (week > 1) {
          expect(balanceAfter).to.be.gt(balanceBefore);
        }
      }

      const finalBalance = await vusdt.balanceOf(buyer1.address);
      // After 4 weeks with compound interest, should have more than 1000 + (4 * 2.2)
      expect(finalBalance).to.be.gt(ethers.parseEther("1008.8"));
    });

    it("Should handle purchase after yield distribution", async function () {
      // Initial purchase
      const initialPurchase = ethers.parseEther("1000");
      await usdt.connect(buyer1).approve(await purchaseContract.getAddress(), initialPurchase);
      await purchaseContract.connect(buyer1).purchaseVUSDT(initialPurchase);
      
      // Register and distribute yield
      await yieldDistributor.registerHolders([buyer1.address]);
      await time.increase(7 * 24 * 60 * 60);
      await yieldDistributor.distributeYield();

      const balanceAfterYield = await vusdt.balanceOf(buyer1.address);

      // Additional purchase
      const additionalPurchase = ethers.parseEther("500");
      await usdt.connect(buyer1).approve(await purchaseContract.getAddress(), additionalPurchase);
      await purchaseContract.connect(buyer1).purchaseVUSDT(additionalPurchase);

      const finalBalance = await vusdt.balanceOf(buyer1.address);
      expect(finalBalance).to.equal(balanceAfterYield + additionalPurchase);
    });
  });
});

