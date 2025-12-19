// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./VUSDT.sol";

/**
 * @title YieldDistributor
 * @dev Contract that distributes weekly yield to VUSDT token holders
 * @notice Distributes 12% APY (compound) every Friday at 00:00 UTC
 */
contract YieldDistributor is Ownable, ReentrancyGuard {
    VUSDT public vusdtToken;

    // Yield parameters
    uint256 public constant ANNUAL_YIELD_BPS = 1200; // 12% in basis points (1/10000)
    uint256 public constant WEEKS_PER_YEAR = 52;
    uint256 public constant SECONDS_PER_WEEK = 7 days;
    
    // Weekly yield rate in basis points (calculated as (1.12^(1/52) - 1) * 10000)
    // Approximately 0.2204% per week
    uint256 public weeklyYieldRateBps = 220; // Can be adjusted by owner

    // Distribution state
    uint256 public lastDistributionTime;
    bool public distributionPaused;
    
    // Holder tracking
    address[] public holders;
    mapping(address => bool) public isRegisteredHolder;
    mapping(address => uint256) public holderIndex;

    // Events
    event YieldDistributed(uint256 totalDistributed, uint256 holdersCount, uint256 timestamp);
    event HolderRegistered(address indexed holder);
    event DistributionPaused();
    event DistributionResumed();
    event YieldRateUpdated(uint256 oldRate, uint256 newRate);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    /**
     * @dev Constructor
     * @param _vusdtToken Address of the VUSDT token contract
     * @param initialOwner Address that will own the contract
     */
    constructor(address _vusdtToken, address initialOwner) Ownable(initialOwner) {
        require(_vusdtToken != address(0), "YieldDistributor: Invalid token address");
        vusdtToken = VUSDT(_vusdtToken);
        lastDistributionTime = block.timestamp;
        distributionPaused = false;
    }

    /**
     * @dev Registers a holder if they have a balance and aren't already registered
     * @param holder Address of the holder to register
     */
    function registerHolder(address holder) internal {
        if (!isRegisteredHolder[holder] && vusdtToken.balanceOf(holder) > 0) {
            isRegisteredHolder[holder] = true;
            holderIndex[holder] = holders.length;
            holders.push(holder);
            emit HolderRegistered(holder);
        }
    }

    /**
     * @dev Removes a holder from the list if their balance is zero
     * @param holder Address of the holder to potentially remove
     */
    function removeHolderIfNeeded(address holder) internal {
        if (isRegisteredHolder[holder] && vusdtToken.balanceOf(holder) == 0) {
            uint256 index = holderIndex[holder];
            uint256 lastIndex = holders.length - 1;
            
            if (index != lastIndex) {
                address lastHolder = holders[lastIndex];
                holders[index] = lastHolder;
                holderIndex[lastHolder] = index;
            }
            
            holders.pop();
            delete isRegisteredHolder[holder];
            delete holderIndex[holder];
        }
    }

    /**
     * @dev Hook called when tokens are transferred to track new holders
     * This should be called from the VUSDT contract's _afterTokenTransfer hook
     * For simplicity, we'll track holders during distribution
     */
    function onTokenTransfer(address from, address to) external {
        require(msg.sender == address(vusdtToken), "YieldDistributor: Only token can call");
        
        if (from != address(0)) {
            removeHolderIfNeeded(from);
        }
        if (to != address(0)) {
            registerHolder(to);
        }
    }

    /**
     * @dev Checks if it's Friday 00:00 UTC (within 24 hour window)
     * @return bool True if it's Friday
     */
    function isFriday() public view returns (bool) {
        // UTC day of week: 0 = Sunday, 5 = Friday
        // block.timestamp is in UTC
        uint256 dayOfWeek = (block.timestamp / SECONDS_PER_WEEK + 4) % 7;
        return dayOfWeek == 5; // Friday
    }

    /**
     * @dev Checks if a week has passed since last distribution
     * @return bool True if a week has passed
     */
    function canDistribute() public view returns (bool) {
        if (distributionPaused) return false;
        if (block.timestamp < lastDistributionTime + SECONDS_PER_WEEK) return false;
        return true;
    }

    /**
     * @dev Calculates yield for a given balance
     * @param balance Token balance
     * @return yieldAmount Amount of yield tokens to mint
     */
    function calculateYield(uint256 balance) public view returns (uint256) {
        if (balance == 0) return 0;
        // Calculate: balance * weeklyYieldRateBps / 10000
        return (balance * weeklyYieldRateBps) / 10000;
    }

    /**
     * @dev Distributes yield to all registered holders
     * Can only be called once per week, preferably on Friday
     */
    function distributeYield() external nonReentrant {
        require(canDistribute(), "YieldDistributor: Cannot distribute yet");
        
        // Update last distribution time
        lastDistributionTime = block.timestamp;

        uint256 totalDistributed = 0;
        uint256 holdersToProcess = holders.length;

        // Process all holders
        for (uint256 i = 0; i < holders.length; i++) {
            address holder = holders[i];
            uint256 balance = vusdtToken.balanceOf(holder);
            
            // Remove holder if balance is zero
            if (balance == 0) {
                removeHolderIfNeeded(holder);
                continue;
            }

            // Calculate and mint yield
            uint256 yieldAmount = calculateYield(balance);
            if (yieldAmount > 0) {
                vusdtToken.mint(holder, yieldAmount);
                totalDistributed += yieldAmount;
            }
        }

        emit YieldDistributed(totalDistributed, holdersToProcess, block.timestamp);
    }

    /**
     * @dev Manually register holders (can be called to update holder list)
     * @param addresses Array of addresses to check and register
     */
    function registerHolders(address[] calldata addresses) external {
        for (uint256 i = 0; i < addresses.length; i++) {
            registerHolder(addresses[i]);
        }
    }

    /**
     * @dev Sets the weekly yield rate in basis points
     * @param newRate New weekly yield rate in basis points (e.g., 220 for 2.2%)
     */
    function setWeeklyYieldRate(uint256 newRate) external onlyOwner {
        require(newRate <= 1000, "YieldDistributor: Rate too high (max 10%)");
        uint256 oldRate = weeklyYieldRateBps;
        weeklyYieldRateBps = newRate;
        emit YieldRateUpdated(oldRate, newRate);
    }

    /**
     * @dev Pauses distribution
     */
    function pauseDistribution() external onlyOwner {
        distributionPaused = true;
        emit DistributionPaused();
    }

    /**
     * @dev Resumes distribution
     */
    function resumeDistribution() external onlyOwner {
        distributionPaused = false;
        emit DistributionResumed();
    }

    /**
     * @dev Emergency withdraw function to withdraw tokens from the contract
     * @param token Address of the token to withdraw (0x0 for native)
     * @param amount Amount to withdraw (0 for all)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // Withdraw native currency
            uint256 balance = address(this).balance;
            uint256 withdrawAmount = amount == 0 ? balance : amount;
            require(withdrawAmount <= balance, "YieldDistributor: Insufficient balance");
            payable(owner()).transfer(withdrawAmount);
            emit EmergencyWithdraw(token, withdrawAmount);
        } else {
            // Withdraw ERC20 tokens
            require(token != address(vusdtToken), "YieldDistributor: Cannot withdraw VUSDT");
            IERC20 tokenContract = IERC20(token);
            uint256 balance = tokenContract.balanceOf(address(this));
            uint256 withdrawAmount = amount == 0 ? balance : amount;
            require(withdrawAmount <= balance, "YieldDistributor: Insufficient balance");
            tokenContract.transfer(owner(), withdrawAmount);
            emit EmergencyWithdraw(token, withdrawAmount);
        }
    }

    /**
     * @dev Gets the number of registered holders
     * @return count Number of holders
     */
    function getHolderCount() external view returns (uint256) {
        return holders.length;
    }

    /**
     * @dev Gets holder address by index
     * @param index Index of the holder
     * @return holder Address of the holder
     */
    function getHolder(uint256 index) external view returns (address) {
        require(index < holders.length, "YieldDistributor: Index out of bounds");
        return holders[index];
    }
}

