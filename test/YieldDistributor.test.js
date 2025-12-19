const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("YieldDistributor", function () {
  let vusdt;
  let yieldDistributor;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  const WEEK = 7 * 24 * 60 * 60; // 7 days in seconds

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy VUSDT token
    const VUSDT = await ethers.getContractFactory("VUSDT");
    vusdt = await VUSDT.deploy(owner.address);
    await vusdt.waitForDeployment();

    // Deploy YieldDistributor
    const YieldDistributor = await ethers.getContractFactory("YieldDistributor");
    yieldDistributor = await YieldDistributor.deploy(
      await vusdt.getAddress(),
      owner.address
    );
    await yieldDistributor.waitForDeployment();

    // Set yield distributor in VUSDT contract
    await vusdt.setYieldDistributor(await yieldDistributor.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct VUSDT token address", async function () {
      expect(await yieldDistributor.vusdtToken()).to.equal(await vusdt.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await yieldDistributor.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct yield rate", async function () {
      expect(await yieldDistributor.weeklyYieldRateBps()).to.equal(220);
    });

    it("Should start with distribution not paused", async function () {
      expect(await yieldDistributor.distributionPaused()).to.be.false;
    });
  });

  describe("Holder Registration", function () {
    it("Should register holder when they receive tokens", async function () {
      const amount = ethers.parseEther("1000");
      await vusdt.mint(addr1.address, amount);
      
      // Manually register holder
      await yieldDistributor.registerHolders([addr1.address]);
      
      expect(await yieldDistributor.isRegisteredHolder(addr1.address)).to.be.true;
      expect(await yieldDistributor.getHolderCount()).to.equal(1);
    });

    it("Should not register holder with zero balance", async function () {
      await yieldDistributor.registerHolders([addr1.address]);
      expect(await yieldDistributor.isRegisteredHolder(addr1.address)).to.be.false;
    });

    it("Should register multiple holders", async function () {
      await vusdt.mint(addr1.address, ethers.parseEther("1000"));
      await vusdt.mint(addr2.address, ethers.parseEther("2000"));
      
      await yieldDistributor.registerHolders([addr1.address, addr2.address]);
      
      expect(await yieldDistributor.getHolderCount()).to.equal(2);
      expect(await yieldDistributor.isRegisteredHolder(addr1.address)).to.be.true;
      expect(await yieldDistributor.isRegisteredHolder(addr2.address)).to.be.true;
    });
  });

  describe("Yield Calculation", function () {
    it("Should calculate yield correctly for 1000 tokens", async function () {
      const balance = ethers.parseEther("1000");
      // 1000 * 220 / 10000 = 22 tokens
      const expectedYield = ethers.parseEther("22");
      const calculatedYield = await yieldDistributor.calculateYield(balance);
      expect(calculatedYield).to.equal(expectedYield);
    });

    it("Should return zero yield for zero balance", async function () {
      const calculatedYield = await yieldDistributor.calculateYield(0);
      expect(calculatedYield).to.equal(0);
    });

    it("Should calculate yield for small amounts", async function () {
      const balance = ethers.parseEther("1");
      // 1 * 220 / 10000 = 0.022 tokens
      const expectedYield = ethers.parseEther("0.022");
      const calculatedYield = await yieldDistributor.calculateYield(balance);
      expect(calculatedYield).to.equal(expectedYield);
    });
  });

  describe("Yield Distribution", function () {
    beforeEach(async function () {
      // Mint tokens to holders
      await vusdt.mint(addr1.address, ethers.parseEther("1000"));
      await vusdt.mint(addr2.address, ethers.parseEther("2000"));
      
      // Register holders
      await yieldDistributor.registerHolders([addr1.address, addr2.address]);
    });

    it("Should not distribute if less than a week has passed", async function () {
      await expect(
        yieldDistributor.distributeYield()
      ).to.be.revertedWith("YieldDistributor: Cannot distribute yet");
    });

    it("Should distribute yield after a week", async function () {
      // Advance time by 1 week
      await time.increase(WEEK);
      
      // Distribute yield
      await yieldDistributor.distributeYield();
      
      // Check balances
      // addr1: 1000 + (1000 * 220 / 10000) = 1000 + 22 = 1022
      expect(await vusdt.balanceOf(addr1.address)).to.equal(ethers.parseEther("1022"));
      
      // addr2: 2000 + (2000 * 220 / 10000) = 2000 + 44 = 2044
      expect(await vusdt.balanceOf(addr2.address)).to.equal(ethers.parseEther("2044"));
    });

    it("Should emit YieldDistributed event", async function () {
      await time.increase(WEEK);
      
      const tx = await yieldDistributor.distributeYield();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(yieldDistributor, "YieldDistributed")
        .withArgs(
          ethers.parseEther("66"), // 22 + 44
          2, // holders count
          block.timestamp
        );
    });

    it("Should support compound interest", async function () {
      // First distribution
      await time.increase(WEEK);
      await yieldDistributor.distributeYield();
      
      // Second distribution (yield on increased balance)
      await time.increase(WEEK);
      await yieldDistributor.distributeYield();
      
      // addr1: 1022 + (1022 * 220 / 10000) = 1022 + 22.484 = 1044.484
      const balance1 = await vusdt.balanceOf(addr1.address);
      expect(balance1).to.be.closeTo(ethers.parseEther("1044.484"), ethers.parseEther("0.001"));
    });

    it("Should not distribute to holders with zero balance", async function () {
      // Transfer all tokens from addr1
      await vusdt.connect(addr1).transfer(addr2.address, ethers.parseEther("1000"));
      
      await time.increase(WEEK);
      await yieldDistributor.distributeYield();
      
      // addr1 should have 0
      expect(await vusdt.balanceOf(addr1.address)).to.equal(0);
      // addr2 should have yield only on their original 2000
      expect(await vusdt.balanceOf(addr2.address)).to.be.gt(ethers.parseEther("2000"));
    });
  });

  describe("Pause/Resume", function () {
    it("Should allow owner to pause distribution", async function () {
      await yieldDistributor.pauseDistribution();
      expect(await yieldDistributor.distributionPaused()).to.be.true;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        yieldDistributor.connect(addr1).pauseDistribution()
      ).to.be.revertedWithCustomError(yieldDistributor, "OwnableUnauthorizedAccount");
    });

    it("Should not distribute when paused", async function () {
      await vusdt.mint(addr1.address, ethers.parseEther("1000"));
      await yieldDistributor.registerHolders([addr1.address]);
      
      await yieldDistributor.pauseDistribution();
      await time.increase(WEEK);
      
      await expect(
        yieldDistributor.distributeYield()
      ).to.be.revertedWith("YieldDistributor: Cannot distribute yet");
    });

    it("Should allow owner to resume distribution", async function () {
      await yieldDistributor.pauseDistribution();
      await yieldDistributor.resumeDistribution();
      expect(await yieldDistributor.distributionPaused()).to.be.false;
    });
  });

  describe("Yield Rate Management", function () {
    it("Should allow owner to change yield rate", async function () {
      const newRate = 250; // 2.5%
      await yieldDistributor.setWeeklyYieldRate(newRate);
      expect(await yieldDistributor.weeklyYieldRateBps()).to.equal(newRate);
    });

    it("Should not allow rate above 10%", async function () {
      await expect(
        yieldDistributor.setWeeklyYieldRate(1001)
      ).to.be.revertedWith("YieldDistributor: Rate too high (max 10%)");
    });

    it("Should use new rate for calculations", async function () {
      await yieldDistributor.setWeeklyYieldRate(250);
      const balance = ethers.parseEther("1000");
      // 1000 * 250 / 10000 = 25 tokens
      const calculatedYield = await yieldDistributor.calculateYield(balance);
      expect(calculatedYield).to.equal(ethers.parseEther("25"));
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to withdraw ERC20 tokens", async function () {
      // Deploy a mock ERC20 token
      const MockERC20 = await ethers.getContractFactory("VUSDT");
      const mockToken = await MockERC20.deploy(owner.address);
      await mockToken.waitForDeployment();
      
      // Mint some tokens to the distributor
      await mockToken.mint(await yieldDistributor.getAddress(), ethers.parseEther("100"));
      
      // Withdraw
      await yieldDistributor.emergencyWithdraw(await mockToken.getAddress(), ethers.parseEther("100"));
      expect(await mockToken.balanceOf(owner.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should not allow withdrawing VUSDT tokens", async function () {
      await vusdt.mint(await yieldDistributor.getAddress(), ethers.parseEther("100"));
      
      await expect(
        yieldDistributor.emergencyWithdraw(await vusdt.getAddress(), ethers.parseEther("100"))
      ).to.be.revertedWith("YieldDistributor: Cannot withdraw VUSDT");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small balances", async function () {
      const smallAmount = ethers.parseEther("0.0001");
      await vusdt.mint(addr1.address, smallAmount);
      await yieldDistributor.registerHolders([addr1.address]);
      
      await time.increase(WEEK);
      await yieldDistributor.distributeYield();
      
      // Should still receive yield (even if very small)
      const balance = await vusdt.balanceOf(addr1.address);
      expect(balance).to.be.gt(smallAmount);
    });

    it("Should handle large balances", async function () {
      const largeAmount = ethers.parseEther("1000000");
      await vusdt.mint(addr1.address, largeAmount);
      await yieldDistributor.registerHolders([addr1.address]);
      
      await time.increase(WEEK);
      await yieldDistributor.distributeYield();
      
      // Should calculate correctly without overflow
      const balance = await vusdt.balanceOf(addr1.address);
      expect(balance).to.be.gt(largeAmount);
    });
  });
});

