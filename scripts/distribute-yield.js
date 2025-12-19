const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Distributing yield with account:", deployer.address);

  // Get contract addresses from environment, deployment-info.json, or use defaults
  let yieldDistributorAddress = process.env.YIELD_DISTRIBUTOR_ADDRESS;
  
  // Try to read from deployment-info.json if not in environment
  if (!yieldDistributorAddress) {
    try {
      const fs = require('fs');
      const deploymentInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf8'));
      yieldDistributorAddress = deploymentInfo.contracts?.YieldDistributor;
      if (yieldDistributorAddress) {
        console.log("Using YieldDistributor address from deployment-info.json:", yieldDistributorAddress);
      }
    } catch (error) {
      // deployment-info.json not found or invalid, continue
    }
  }
  
  if (!yieldDistributorAddress) {
    console.error("Error: YIELD_DISTRIBUTOR_ADDRESS not set");
    console.log("\nOptions:");
    console.log("1. Set YIELD_DISTRIBUTOR_ADDRESS in .env file");
    console.log("2. Or ensure deployment-info.json exists with contract addresses");
    console.log("\nUsage: YIELD_DISTRIBUTOR_ADDRESS=0x... npx hardhat run scripts/distribute-yield.js --network <network>");
    process.exit(1);
  }

  const YieldDistributor = await hre.ethers.getContractFactory("YieldDistributor");
  const yieldDistributor = YieldDistributor.attach(yieldDistributorAddress);

  // Check if distribution is paused
  const isPaused = await yieldDistributor.distributionPaused();
  if (isPaused) {
    console.error("Error: Distribution is paused");
    process.exit(1);
  }

  // Check if can distribute
  const canDistribute = await yieldDistributor.canDistribute();
  if (!canDistribute) {
    console.error("Error: Cannot distribute yet. Check if a week has passed since last distribution.");
    const lastDistribution = await yieldDistributor.lastDistributionTime();
    const nextDistribution = Number(lastDistribution) + 7 * 24 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilNext = nextDistribution - now;
    console.log(`Last distribution: ${new Date(Number(lastDistribution) * 1000).toISOString()}`);
    console.log(`Next distribution available in: ${Math.floor(timeUntilNext / 3600)} hours`);
    process.exit(1);
  }

  // Get holder count before distribution
  const holderCountBefore = await yieldDistributor.getHolderCount();
  console.log(`Registered holders: ${holderCountBefore}`);

  // Get VUSDT contract to check balances
  const vusdtAddress = await yieldDistributor.vusdtToken();
  const VUSDT = await hre.ethers.getContractFactory("VUSDT");
  const vusdt = VUSDT.attach(vusdtAddress);

  // Calculate total supply before
  const totalSupplyBefore = await vusdt.totalSupply();
  console.log(`Total supply before: ${hre.ethers.formatEther(totalSupplyBefore)} VUSDT`);

  // Distribute yield
  console.log("\nDistributing yield...");
  const tx = await yieldDistributor.distributeYield();
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Get event data
  const yieldDistributedEvent = receipt.logs.find(
    log => {
      try {
        const parsed = yieldDistributor.interface.parseLog(log);
        return parsed && parsed.name === "YieldDistributed";
      } catch {
        return false;
      }
    }
  );

  if (yieldDistributedEvent) {
    const parsed = yieldDistributor.interface.parseLog(yieldDistributedEvent);
    console.log("\n=== Distribution Results ===");
    console.log("Total distributed:", hre.ethers.formatEther(parsed.args.totalDistributed), "VUSDT");
    console.log("Holders processed:", parsed.args.holdersCount.toString());
    console.log("Distribution time:", new Date(Number(parsed.args.timestamp) * 1000).toISOString());
  }

  // Check total supply after
  const totalSupplyAfter = await vusdt.totalSupply();
  console.log(`Total supply after: ${hre.ethers.formatEther(totalSupplyAfter)} VUSDT`);
  console.log(`New tokens minted: ${hre.ethers.formatEther(totalSupplyAfter - totalSupplyBefore)} VUSDT`);

  console.log("\n✅ Yield distribution completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

