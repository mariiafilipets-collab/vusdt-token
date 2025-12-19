const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VUSDT Token", function () {
  let vusdt;
  let owner;
  let yieldDistributor;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, yieldDistributor, addr1, addr2] = await ethers.getSigners();

    const VUSDT = await ethers.getContractFactory("VUSDT");
    vusdt = await VUSDT.deploy(owner.address);
    await vusdt.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vusdt.owner()).to.equal(owner.address);
    });

    it("Should assign the correct name and symbol", async function () {
      expect(await vusdt.name()).to.equal("VUSDT Token");
      expect(await vusdt.symbol()).to.equal("VUSDT");
    });

    it("Should have 18 decimals", async function () {
      expect(await vusdt.decimals()).to.equal(18);
    });

    it("Should start with zero total supply", async function () {
      expect(await vusdt.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const amount = ethers.parseEther("1000");
      await vusdt.mint(addr1.address, amount);
      expect(await vusdt.balanceOf(addr1.address)).to.equal(amount);
      expect(await vusdt.totalSupply()).to.equal(amount);
    });

    it("Should allow yield distributor to mint tokens", async function () {
      await vusdt.setYieldDistributor(yieldDistributor.address);
      const amount = ethers.parseEther("500");
      await vusdt.connect(yieldDistributor).mint(addr1.address, amount);
      expect(await vusdt.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should not allow unauthorized addresses to mint", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        vusdt.connect(addr1).mint(addr2.address, amount)
      ).to.be.revertedWith("VUSDT: Only owner, yield distributor, or purchase contract can mint");
    });

    it("Should not allow minting to zero address", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        vusdt.mint(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("VUSDT: Cannot mint to zero address");
    });

    it("Should emit TokensMinted event", async function () {
      const amount = ethers.parseEther("1000");
      await expect(vusdt.mint(addr1.address, amount))
        .to.emit(vusdt, "TokensMinted")
        .withArgs(addr1.address, amount);
    });
  });

  describe("Yield Distributor Management", function () {
    it("Should allow owner to set yield distributor", async function () {
      await vusdt.setYieldDistributor(yieldDistributor.address);
      expect(await vusdt.yieldDistributor()).to.equal(yieldDistributor.address);
    });

    it("Should not allow non-owner to set yield distributor", async function () {
      await expect(
        vusdt.connect(addr1).setYieldDistributor(yieldDistributor.address)
      ).to.be.revertedWithCustomError(vusdt, "OwnableUnauthorizedAccount");
    });

    it("Should not allow setting zero address as yield distributor", async function () {
      await expect(
        vusdt.setYieldDistributor(ethers.ZeroAddress)
      ).to.be.revertedWith("VUSDT: Invalid address");
    });

    it("Should emit YieldDistributorUpdated event", async function () {
      await expect(vusdt.setYieldDistributor(yieldDistributor.address))
        .to.emit(vusdt, "YieldDistributorUpdated")
        .withArgs(ethers.ZeroAddress, yieldDistributor.address);
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause", async function () {
      await vusdt.pause();
      expect(await vusdt.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await vusdt.pause();
      await vusdt.unpause();
      expect(await vusdt.paused()).to.be.false;
    });

    it("Should not allow transfers when paused", async function () {
      const amount = ethers.parseEther("1000");
      await vusdt.mint(addr1.address, amount);
      await vusdt.pause();
      
      await expect(
        vusdt.connect(addr1).transfer(addr2.address, amount)
      ).to.be.revertedWithCustomError(vusdt, "EnforcedPause");
    });

    it("Should allow transfers when unpaused", async function () {
      const amount = ethers.parseEther("1000");
      await vusdt.mint(addr1.address, amount);
      await vusdt.pause();
      await vusdt.unpause();
      
      await vusdt.connect(addr1).transfer(addr2.address, amount);
      expect(await vusdt.balanceOf(addr2.address)).to.equal(amount);
    });
  });

  describe("ERC20 Standard", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1000");
      await vusdt.mint(addr1.address, amount);
    });

    it("Should transfer tokens correctly", async function () {
      const transferAmount = ethers.parseEther("100");
      await vusdt.connect(addr1).transfer(addr2.address, transferAmount);
      expect(await vusdt.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await vusdt.balanceOf(addr1.address)).to.equal(ethers.parseEther("900"));
    });

    it("Should approve and transferFrom correctly", async function () {
      const approveAmount = ethers.parseEther("200");
      await vusdt.connect(addr1).approve(addr2.address, approveAmount);
      expect(await vusdt.allowance(addr1.address, addr2.address)).to.equal(approveAmount);
      
      const transferAmount = ethers.parseEther("150");
      await vusdt.connect(addr2).transferFrom(addr1.address, addr2.address, transferAmount);
      expect(await vusdt.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await vusdt.balanceOf(addr1.address)).to.equal(ethers.parseEther("850"));
    });
  });
});

