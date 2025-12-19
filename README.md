# VUSDT Token - Weekly Yield Distribution

VUSDT is an ERC-20 token deployed on BNB Smart Chain (BSC) that automatically distributes 12% APY (compound interest) to all token holders every Friday at 00:00 UTC.

## Features

- **ERC-20 Standard Token**: Full compatibility with wallets and DEXs
- **Weekly Yield Distribution**: 12% APY paid weekly (compound interest)
- **Automatic Distribution**: All holders receive yield based on their balance
- **No Liquidity Required**: Token can be sent directly to any wallet
- **Admin Controls**: Pause/resume, rate adjustment, emergency functions
- **Web Interface**: React-based dApp for easy interaction

## Project Structure

```
VUSDT/
├── contracts/
│   ├── VUSDT.sol              # Main ERC-20 token contract
│   └── YieldDistributor.sol   # Yield distribution contract
├── scripts/
│   ├── deploy.js              # Deployment script
│   └── distribute-yield.js    # Manual yield distribution script
├── test/
│   ├── VUSDT.test.js          # Token tests
│   └── YieldDistributor.test.js # Distributor tests
├── frontend/                  # React web interface
└── hardhat.config.js          # Hardhat configuration
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask browser extension
- BNB for gas fees (on BSC)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VUSDT
```

2. Install dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

4. Create `.env` file in the root directory:
```env
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

## Deployment

### Deploy to BSC Testnet

1. Make sure you have BNB testnet tokens in your wallet
2. Run the deployment script:
```bash
npm run deploy:testnet
```

3. Save the contract addresses from the output

### Deploy to BSC Mainnet

1. Make sure you have BNB in your wallet
2. Run the deployment script:
```bash
npm run deploy:mainnet
```

3. Verify contracts on BSCScan (optional):
```bash
npx hardhat verify --network bscMainnet <VUSDT_ADDRESS> <OWNER_ADDRESS>
npx hardhat verify --network bscMainnet <YIELD_DISTRIBUTOR_ADDRESS> <VUSDT_ADDRESS> <OWNER_ADDRESS>
```

## Configuration

### Frontend Configuration

1. Create `frontend/.env` file:
```env
REACT_APP_VUSDT_ADDRESS=0x...
REACT_APP_YIELD_DISTRIBUTOR_ADDRESS=0x...
```

2. Start the frontend:
```bash
cd frontend
npm start
```

## Usage

### For Token Holders

1. **Receive Tokens**: VUSDT tokens can be sent directly to any wallet address
2. **Register for Yield**: If you receive tokens, you may need to register as a holder:
   - Use the web interface "Register for Yield" button, or
   - Call `registerHolders([your_address])` on the YieldDistributor contract
3. **Automatic Yield**: Every Friday at 00:00 UTC, yield is distributed automatically
4. **Check Balance**: Use the web interface or check your wallet

### For Contract Owner

1. **Distribute Yield**: Every Friday, call `distributeYield()` on the YieldDistributor contract:
   ```bash
   YIELD_DISTRIBUTOR_ADDRESS=0x... npm run distribute -- --network bscMainnet
   ```

2. **Manage Distribution**:
   - Pause: `pauseDistribution()`
   - Resume: `resumeDistribution()`
   - Change Rate: `setWeeklyYieldRate(uint256 newRate)` (in basis points, max 1000 = 10%)

3. **Emergency Functions**:
   - Withdraw tokens: `emergencyWithdraw(address token, uint256 amount)`

## Yield Calculation

- **Annual Yield**: 12% APY
- **Weekly Rate**: ~0.22% (compound interest)
- **Formula**: `weeklyRate = (1.12^(1/52) - 1) * 10000` basis points
- **Calculation**: `yield = balance * weeklyYieldRateBps / 10000`

The yield compounds weekly, meaning each week's yield is calculated on the increased balance (including previous yields).

## Testing

Run the test suite:
```bash
npm test
```

This will run all tests including:
- Token functionality (minting, transfers, pausing)
- Yield distribution logic
- Compound interest calculations
- Security checks
- Edge cases

## Security Considerations

- Contracts use OpenZeppelin's battle-tested libraries
- ReentrancyGuard protection
- Access control with Ownable
- Pausable functionality for emergencies
- Input validation on all functions

**Important**: Before deploying to mainnet:
1. Review all code thoroughly
2. Consider a professional audit
3. Test extensively on testnet
4. Start with small amounts

## Gas Optimization

The contract tracks holders in an array. For large numbers of holders:
- Consider batch processing
- Monitor gas costs
- May need to optimize for very large holder counts

## Smart Contract Addresses

After deployment, save your contract addresses:

- **VUSDT Token**: `0x...`
- **YieldDistributor**: `0x...`

## Troubleshooting

### "Cannot distribute yet"
- Wait until at least 7 days have passed since last distribution
- Check if distribution is paused

### "Not registered as holder"
- Call `registerHolders([your_address])` on the YieldDistributor contract
- Or use the web interface registration button

### Frontend not connecting
- Make sure MetaMask is installed
- Switch to BNB Smart Chain network
- Check that contract addresses are set in `.env`

## License

MIT

## Support

For issues and questions, please open an issue on the repository.

## Disclaimer

This software is provided as-is. Use at your own risk. Always test thoroughly on testnet before deploying to mainnet.

