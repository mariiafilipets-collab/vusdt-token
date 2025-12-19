// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./VUSDT.sol";

/**
 * @title VUSDTPurchase
 * @dev Contract for purchasing VUSDT tokens with USDT (BEP-20) at 1:1 rate
 * @notice USDT is sent to a central wallet address
 */
contract VUSDTPurchase is Ownable, ReentrancyGuard {
    VUSDT public vusdtToken;
    IERC20 public usdtToken; // USDT (BEP-20) token address
    address public centralWallet; // Wallet that receives USDT

    // Allow contract to receive native currency
    receive() external payable {}
    
    // Purchase statistics
    uint256 public totalPurchased;
    uint256 public totalUSDTReceived;
    mapping(address => uint256) public userPurchases;
    
    // Events
    event VUSDTPurchased(address indexed buyer, uint256 usdtAmount, uint256 vusdtAmount, uint256 timestamp);
    event CentralWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event USDTTokenUpdated(address indexed oldToken, address indexed newToken);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    
    /**
     * @dev Constructor
     * @param _vusdtToken Address of the VUSDT token contract
     * @param _usdtToken Address of the USDT (BEP-20) token contract
     * @param _centralWallet Address that will receive USDT payments
     * @param initialOwner Address that will own the contract
     */
    constructor(
        address _vusdtToken,
        address _usdtToken,
        address _centralWallet,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_vusdtToken != address(0), "VUSDTPurchase: Invalid VUSDT address");
        require(_usdtToken != address(0), "VUSDTPurchase: Invalid USDT address");
        require(_centralWallet != address(0), "VUSDTPurchase: Invalid central wallet");
        
        vusdtToken = VUSDT(_vusdtToken);
        usdtToken = IERC20(_usdtToken);
        centralWallet = _centralWallet;
    }
    
    /**
     * @dev Purchase VUSDT tokens with USDT at 1:1 rate
     * @param usdtAmount Amount of USDT to spend (in USDT decimals, usually 18)
     */
    function purchaseVUSDT(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount > 0, "VUSDTPurchase: Amount must be greater than 0");
        
        // Transfer USDT from buyer to central wallet
        require(
            usdtToken.transferFrom(msg.sender, centralWallet, usdtAmount),
            "VUSDTPurchase: USDT transfer failed"
        );
        
        // Mint VUSDT tokens to buyer (1:1 rate)
        vusdtToken.mint(msg.sender, usdtAmount);
        
        // Update statistics
        totalPurchased += usdtAmount;
        totalUSDTReceived += usdtAmount;
        userPurchases[msg.sender] += usdtAmount;
        
        emit VUSDTPurchased(msg.sender, usdtAmount, usdtAmount, block.timestamp);
    }
    
    /**
     * @dev Set the central wallet address
     * @param _centralWallet New central wallet address
     */
    function setCentralWallet(address _centralWallet) external onlyOwner {
        require(_centralWallet != address(0), "VUSDTPurchase: Invalid address");
        address oldWallet = centralWallet;
        centralWallet = _centralWallet;
        emit CentralWalletUpdated(oldWallet, _centralWallet);
    }
    
    /**
     * @dev Set the USDT token address
     * @param _usdtToken New USDT token address
     */
    function setUSDTToken(address _usdtToken) external onlyOwner {
        require(_usdtToken != address(0), "VUSDTPurchase: Invalid address");
        address oldToken = address(usdtToken);
        usdtToken = IERC20(_usdtToken);
        emit USDTTokenUpdated(oldToken, _usdtToken);
    }
    
    /**
     * @dev Get purchase statistics for a user
     * @param user Address of the user
     * @return totalPurchased Total amount of VUSDT purchased by user
     */
    function getUserPurchaseStats(address user) external view returns (uint256) {
        return userPurchases[user];
    }
    
    /**
     * @dev Emergency withdraw function
     * @param token Address of the token to withdraw (0x0 for native)
     * @param amount Amount to withdraw (0 for all)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // Withdraw native currency
            uint256 balance = address(this).balance;
            uint256 withdrawAmount = amount == 0 ? balance : amount;
            require(withdrawAmount <= balance, "VUSDTPurchase: Insufficient balance");
            payable(owner()).transfer(withdrawAmount);
            emit EmergencyWithdraw(token, withdrawAmount);
        } else {
            // Withdraw ERC20 tokens
            IERC20 tokenContract = IERC20(token);
            uint256 balance = tokenContract.balanceOf(address(this));
            uint256 withdrawAmount = amount == 0 ? balance : amount;
            require(withdrawAmount <= balance, "VUSDTPurchase: Insufficient balance");
            tokenContract.transfer(owner(), withdrawAmount);
            emit EmergencyWithdraw(token, withdrawAmount);
        }
    }
}

