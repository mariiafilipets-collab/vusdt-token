const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy VUSDT Token
  console.log("\n1. Deploying VUSDT Token...");
  const VUSDT = await hre.ethers.getContractFactory("VUSDT");
  const vusdt = await VUSDT.deploy(deployer.address);
  await vusdt.waitForDeployment();
  const vusdtAddress = await vusdt.getAddress();
  console.log("VUSDT Token deployed to:", vusdtAddress);

  // Deploy YieldDistributor
  console.log("\n2. Deploying YieldDistributor...");
  const YieldDistributor = await hre.ethers.getContractFactory("YieldDistributor");
  const yieldDistributor = await YieldDistributor.deploy(vusdtAddress, deployer.address);
  await yieldDistributor.waitForDeployment();
  const yieldDistributorAddress = await yieldDistributor.getAddress();
  console.log("YieldDistributor deployed to:", yieldDistributorAddress);

  // Set YieldDistributor in VUSDT contract
  console.log("\n3. Configuring contracts...");
  await vusdt.setYieldDistributor(yieldDistributorAddress);
  console.log("YieldDistributor set in VUSDT contract");

  // Optional: Mint initial tokens to deployer
  const initialSupply = hre.ethers.parseEther("1000000"); // 1M tokens
  console.log("\n4. Minting initial supply to deployer...");
  await vusdt.mint(deployer.address, initialSupply);
  console.log(`Minted ${hre.ethers.formatEther(initialSupply)} VUSDT to deployer`);

  // Register deployer as holder
  console.log("\n5. Registering deployer as holder...");
  await yieldDistributor.registerHolders([deployer.address]);
  console.log("Deployer registered as holder");

  // Initialize deployment info
  const network = await hre.ethers.provider.getNetwork();
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contracts: {
      VUSDT: vusdtAddress,
      YieldDistributor: yieldDistributorAddress,
    },
    timestamp: new Date().toISOString(),
  };

  // Deploy VUSDTPurchase contract (optional - requires USDT address)
  const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS || "";
  const CENTRAL_WALLET = process.env.CENTRAL_WALLET_ADDRESS || deployer.address;
  
  if (USDT_ADDRESS) {
    console.log("\n6. Deploying VUSDTPurchase contract...");
    const VUSDTPurchase = await hre.ethers.getContractFactory("VUSDTPurchase");
    const purchaseContract = await VUSDTPurchase.deploy(
      vusdtAddress,
      USDT_ADDRESS,
      CENTRAL_WALLET,
      deployer.address
    );
    await purchaseContract.waitForDeployment();
    const purchaseAddress = await purchaseContract.getAddress();
    console.log("VUSDTPurchase deployed to:", purchaseAddress);
    
    // Set purchase contract in VUSDT
    console.log("7. Configuring VUSDT to allow purchase contract to mint...");
    await vusdt.setPurchaseContract(purchaseAddress);
    console.log("Purchase contract set in VUSDT");
    
    deploymentInfo.contracts.VUSDTPurchase = purchaseAddress;
    deploymentInfo.centralWallet = CENTRAL_WALLET;
    deploymentInfo.usdtToken = USDT_ADDRESS;
  } else {
    console.log("\n6. Skipping VUSDTPurchase deployment (USDT_TOKEN_ADDRESS not set)");
    console.log("   To deploy purchase contract, set USDT_TOKEN_ADDRESS in .env");
    console.log("   USDT Token Address on BSC Testnet: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd");
    console.log("   USDT Token Address on BSC Mainnet: 0x55d398326f99059fF775485246999027B3197955");
  }

  // Deploy ConversionRequest contract
  const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || deployer.address;
  
  if (USDT_ADDRESS) {
    console.log("\n8. Deploying ConversionRequest contract...");
    const ConversionRequest = await hre.ethers.getContractFactory("ConversionRequest");
    const conversionContract = await ConversionRequest.deploy(
      vusdtAddress,
      USDT_ADDRESS,
      TREASURY_WALLET,
      deployer.address
    );
    await conversionContract.waitForDeployment();
    const conversionAddress = await conversionContract.getAddress();
    console.log("ConversionRequest deployed to:", conversionAddress);
    
    deploymentInfo.contracts.ConversionRequest = conversionAddress;
    deploymentInfo.treasuryWallet = TREASURY_WALLET;
  } else {
    console.log("\n8. Skipping ConversionRequest deployment (USDT_TOKEN_ADDRESS not set)");
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("VUSDT Token:", vusdtAddress);
  console.log("YieldDistributor:", yieldDistributorAddress);
  if (USDT_ADDRESS) {
    console.log("VUSDTPurchase:", deploymentInfo.contracts.VUSDTPurchase);
    console.log("Central Wallet:", CENTRAL_WALLET);
    if (deploymentInfo.contracts.ConversionRequest) {
      console.log("ConversionRequest:", deploymentInfo.contracts.ConversionRequest);
      console.log("Treasury Wallet:", TREASURY_WALLET);
    }
  }
  console.log("Deployer:", deployer.address);
  console.log("Initial Supply:", hre.ethers.formatEther(initialSupply), "VUSDT");
  console.log("\n=== Next Steps ===");
  console.log("1. Verify contracts on BSCScan (if on testnet/mainnet)");
  console.log("2. Call distributeYield() every Friday at 00:00 UTC");
  console.log("3. Register new holders using registerHolders() when they receive tokens");
  if (USDT_ADDRESS) {
    console.log("4. Add REACT_APP_PURCHASE_CONTRACT_ADDRESS to frontend/.env");
    console.log("5. Add REACT_APP_USDT_TOKEN_ADDRESS to frontend/.env");
    if (deploymentInfo.contracts.ConversionRequest) {
      console.log("6. Add REACT_APP_CONVERSION_CONTRACT_ADDRESS to frontend/.env");
    }
  }

  // Save to file
  const fs = require('fs');
  fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
