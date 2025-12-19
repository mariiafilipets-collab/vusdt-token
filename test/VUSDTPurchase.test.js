const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VUSDTPurchase", function () {
  let vusdt, usdt, purchaseContract;
  let owner, buyer, centralWallet;
  let ownerSigner, buyerSigner, centralWalletSigner;

  // Mock USDT token for testing
  const MockUSDT = `
    pragma solidity ^0.8.20;
    import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
    contract MockUSDT is ERC20 {
      constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**18);
      }
      function mint(address to, uint256 amount) external {
        _mint(to, amount);
      }
    }
  `;

  beforeEach(async function () {
    [owner, buyer, centralWallet] = await ethers.getSigners();
    ownerSigner = owner;
    buyerSigner = buyer;
    centralWalletSigner = centralWallet;

    // Deploy VUSDT
    const VUSDT = await ethers.getContractFactory("VUSDT");
    vusdt = await VUSDT.deploy(owner.address);
    await vusdt.waitForDeployment();

    // Deploy Mock USDT
    const mockUSDTFactory = await ethers.getContractFactory("MockUSDT");
    usdt = await mockUSDTFactory.deploy();
    await usdt.waitForDeployment();

    // Deploy Purchase Contract
    const Purchase = await ethers.getContractFactory("VUSDTPurchase");
    purchaseContract = await Purchase.deploy(
      await vusdt.getAddress(),
      await usdt.getAddress(),
      centralWallet.address,
      owner.address
    );
    await purchaseContract.waitForDeployment();

    // Set purchase contract in VUSDT
    await vusdt.setPurchaseContract(await purchaseContract.getAddress());

    // Give buyer some USDT
    await usdt.transfer(buyer.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the correct addresses", async function () {
      expect(await purchaseContract.vusdtToken()).to.equal(await vusdt.getAddress());
      expect(await purchaseContract.usdtToken()).to.equal(await usdt.getAddress());
      expect(await purchaseContract.centralWallet()).to.equal(centralWallet.address);
      expect(await purchaseContract.owner()).to.equal(owner.address);
    });

    it("Should have zero initial statistics", async function () {
      expect(await purchaseContract.totalPurchased()).to.equal(0);
      expect(await purchaseContract.totalUSDTReceived()).to.equal(0);
      expect(await purchaseContract.userPurchases(buyer.address)).to.equal(0);
    });
  });

  describe("Purchase VUSDT", function () {
    it("Should allow purchase of VUSDT with USDT at 1:1 rate", async function () {
      const purchaseAmount = ethers.parseEther("100");
      
      // Approve USDT spending
      await usdt.connect(buyer).approve(
        await purchaseContract.getAddress(),
        purchaseAmount
      );

      // Check initial balances
      const initialUSDTBalance = await usdt.balanceOf(buyer.address);
      const initialVUSDTBalance = await vusdt.balanceOf(buyer.address);
      const initialCentralUSDT = await usdt.balanceOf(centralWallet.address);

      // Purchase VUSDT
      const tx = await purchaseContract.connect(buyer).purchaseVUSDT(purchaseAmount);
      const receipt = await tx.wait();
      const blockNumber = receipt.blockNumber;
      
      await expect(tx).to.emit(purchaseContract, "VUSDTPurchased")
        .withArgs(buyer.address, purchaseAmount, purchaseAmount, (await ethers.provider.getBlock(blockNumber)).timestamp);

      // Check balances after purchase
      expect(await usdt.balanceOf(buyer.address)).to.equal(initialUSDTBalance - purchaseAmount);
      expect(await vusdt.balanceOf(buyer.address)).to.equal(initialVUSDTBalance + purchaseAmount);
      expect(await usdt.balanceOf(centralWallet.address)).to.equal(initialCentralUSDT + purchaseAmount);

      // Check statistics
      expect(await purchaseContract.totalPurchased()).to.equal(purchaseAmount);
      expect(await purchaseContract.totalUSDTReceived()).to.equal(purchaseAmount);
      expect(await purchaseContract.userPurchases(buyer.address)).to.equal(purchaseAmount);
    });

    it("Should reject purchase with zero amount", async function () {
      await expect(
        purchaseContract.connect(buyer).purchaseVUSDT(0)
      ).to.be.revertedWith("VUSDTPurchase: Amount must be greater than 0");
    });

    it("Should reject purchase without USDT approval", async function () {
      const purchaseAmount = ethers.parseEther("100");
      
      await expect(
        purchaseContract.connect(buyer).purchaseVUSDT(purchaseAmount)
      ).to.be.reverted;
    });

    it("Should reject purchase with insufficient USDT balance", async function () {
      const purchaseAmount = ethers.parseEther("10000"); // More than buyer has
      
      await usdt.connect(buyer).approve(
        await purchaseContract.getAddress(),
        purchaseAmount
      );

      await expect(
        purchaseContract.connect(buyer).purchaseVUSDT(purchaseAmount)
      ).to.be.reverted;
    });

    it("Should allow multiple purchases", async function () {
      const purchaseAmount1 = ethers.parseEther("50");
      const purchaseAmount2 = ethers.parseEther("75");

      // First purchase
      await usdt.connect(buyer).approve(
        await purchaseContract.getAddress(),
        purchaseAmount1
      );
      await purchaseContract.connect(buyer).purchaseVUSDT(purchaseAmount1);

      // Second purchase
      await usdt.connect(buyer).approve(
        await purchaseContract.getAddress(),
        purchaseAmount2
      );
      await purchaseContract.connect(buyer).purchaseVUSDT(purchaseAmount2);

      // Check total statistics
      const total = purchaseAmount1 + purchaseAmount2;
      expect(await purchaseContract.totalPurchased()).to.equal(total);
      expect(await purchaseContract.totalUSDTReceived()).to.equal(total);
      expect(await purchaseContract.userPurchases(buyer.address)).to.equal(total);
    });
  });

  describe("Administrative Functions", function () {
    it("Should allow owner to change central wallet", async function () {
      const [newWallet] = await ethers.getSigners();
      const newWalletAddress = newWallet.address;
      
      await expect(purchaseContract.connect(owner).setCentralWallet(newWalletAddress))
        .to.emit(purchaseContract, "CentralWalletUpdated")
        .withArgs(centralWallet.address, newWalletAddress);

      expect(await purchaseContract.centralWallet()).to.equal(newWalletAddress);
    });

    it("Should reject central wallet change from non-owner", async function () {
      const [newWallet] = await ethers.getSigners();
      
      await expect(
        purchaseContract.connect(buyer).setCentralWallet(newWallet.address)
      ).to.be.revertedWithCustomError(purchaseContract, "OwnableUnauthorizedAccount");
    });

    it("Should reject zero address for central wallet", async function () {
      await expect(
        purchaseContract.connect(owner).setCentralWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("VUSDTPurchase: Invalid address");
    });

    it("Should allow owner to change USDT token address", async function () {
      // Deploy new mock USDT
      const MockUSDT = await ethers.getContractFactory("MockUSDT");
      const newUSDT = await MockUSDT.deploy();
      await newUSDT.waitForDeployment();

      await expect(purchaseContract.connect(owner).setUSDTToken(await newUSDT.getAddress()))
        .to.emit(purchaseContract, "USDTTokenUpdated")
        .withArgs(await usdt.getAddress(), await newUSDT.getAddress());

      expect(await purchaseContract.usdtToken()).to.equal(await newUSDT.getAddress());
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to withdraw native currency", async function () {
      // Send some native currency to contract
      const sendTx = await owner.sendTransaction({
        to: await purchaseContract.getAddress(),
        value: ethers.parseEther("1")
      });
      await sendTx.wait();

      const initialBalance = await ethers.provider.getBalance(owner.address);
      const contractBalance = await ethers.provider.getBalance(await purchaseContract.getAddress());
      expect(contractBalance).to.equal(ethers.parseEther("1"));

      const tx = await purchaseContract.connect(owner).emergencyWithdraw(ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(owner.address);
      // Allow for gas costs
      expect(finalBalance).to.be.closeTo(initialBalance + contractBalance - gasUsed, ethers.parseEther("0.1"));
    });

    it("Should allow owner to withdraw ERC20 tokens", async function () {
      // Send some USDT to contract
      await usdt.transfer(await purchaseContract.getAddress(), ethers.parseEther("100"));

      const initialBalance = await usdt.balanceOf(owner.address);
      await purchaseContract.connect(owner).emergencyWithdraw(await usdt.getAddress(), 0);

      expect(await usdt.balanceOf(owner.address)).to.equal(initialBalance + ethers.parseEther("100"));
    });

    it("Should reject emergency withdraw from non-owner", async function () {
      await expect(
        purchaseContract.connect(buyer).emergencyWithdraw(ethers.ZeroAddress, 0)
      ).to.be.revertedWithCustomError(purchaseContract, "OwnableUnauthorizedAccount");
    });
  });
});

