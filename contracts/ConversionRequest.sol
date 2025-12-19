// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./VUSDT.sol";

/**
 * @title ConversionRequest
 * @dev Contract for managing VUSDT to USDT conversion requests
 * @notice Conversion takes 14 days, tokens are locked during this period
 */
contract ConversionRequest is Ownable, ReentrancyGuard {
    VUSDT public vusdtToken;
    IERC20 public usdtToken;
    address public treasuryWallet; // Wallet that holds USDT for conversions
    
    // Conversion period: 14 days
    uint256 public constant CONVERSION_PERIOD = 14 days;
    
    // Request status enum
    enum RequestStatus {
        Pending,      // Request submitted, waiting for processing
        Processing,    // Admin marked as processing
        Completed,     // Conversion completed
        Cancelled      // Request cancelled
    }
    
    // Conversion request structure
    struct Request {
        address requester;
        uint256 vusdtAmount;
        uint256 requestedAt;
        uint256 lockedUntil;
        RequestStatus status;
        bool exists;
    }
    
    // Mapping: requestId => Request
    mapping(uint256 => Request) public requests;
    
    // Mapping: user => requestIds[]
    mapping(address => uint256[]) public userRequests;
    
    // Mapping: user => locked amount
    mapping(address => uint256) public lockedBalances;
    
    // Total requests counter
    uint256 public totalRequests;
    
    // Events
    event ConversionRequested(
        uint256 indexed requestId,
        address indexed requester,
        uint256 vusdtAmount,
        uint256 requestedAt,
        uint256 lockedUntil
    );
    
    event RequestStatusUpdated(
        uint256 indexed requestId,
        RequestStatus oldStatus,
        RequestStatus newStatus
    );
    
    event ConversionCompleted(
        uint256 indexed requestId,
        address indexed requester,
        uint256 vusdtAmount,
        uint256 usdtAmount
    );
    
    event RequestCancelled(uint256 indexed requestId, address indexed requester);
    event TreasuryWalletUpdated(address indexed oldWallet, address indexed newWallet);
    
    /**
     * @dev Constructor
     * @param _vusdtToken Address of VUSDT token
     * @param _usdtToken Address of USDT token
     * @param _treasuryWallet Address that holds USDT for conversions
     * @param initialOwner Address that will own the contract
     */
    constructor(
        address _vusdtToken,
        address _usdtToken,
        address _treasuryWallet,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_vusdtToken != address(0), "ConversionRequest: Invalid VUSDT address");
        require(_usdtToken != address(0), "ConversionRequest: Invalid USDT address");
        require(_treasuryWallet != address(0), "ConversionRequest: Invalid treasury wallet");
        
        vusdtToken = VUSDT(_vusdtToken);
        usdtToken = IERC20(_usdtToken);
        treasuryWallet = _treasuryWallet;
    }
    
    /**
     * @dev Request conversion from VUSDT to USDT
     * @param vusdtAmount Amount of VUSDT to convert
     * @return requestId ID of the created request
     */
    function requestConversion(uint256 vusdtAmount) external nonReentrant returns (uint256) {
        require(vusdtAmount > 0, "ConversionRequest: Amount must be greater than 0");
        
        address requester = msg.sender;
        uint256 balance = vusdtToken.balanceOf(requester);
        require(balance >= vusdtAmount, "ConversionRequest: Insufficient VUSDT balance");
        
        // Lock tokens by transferring to this contract
        require(
            vusdtToken.transferFrom(requester, address(this), vusdtAmount),
            "ConversionRequest: Token transfer failed"
        );
        
        // Create request
        uint256 requestId = totalRequests++;
        uint256 requestedAt = block.timestamp;
        uint256 lockedUntil = requestedAt + CONVERSION_PERIOD;
        
        requests[requestId] = Request({
            requester: requester,
            vusdtAmount: vusdtAmount,
            requestedAt: requestedAt,
            lockedUntil: lockedUntil,
            status: RequestStatus.Pending,
            exists: true
        });
        
        // Update locked balance
        lockedBalances[requester] += vusdtAmount;
        
        // Add to user's requests
        userRequests[requester].push(requestId);
        
        emit ConversionRequested(requestId, requester, vusdtAmount, requestedAt, lockedUntil);
        
        return requestId;
    }
    
    /**
     * @dev Admin marks request as processing
     * @param requestId ID of the request
     */
    function markAsProcessing(uint256 requestId) external onlyOwner {
        Request storage request = requests[requestId];
        require(request.exists, "ConversionRequest: Request does not exist");
        require(request.status == RequestStatus.Pending, "ConversionRequest: Invalid status");
        
        RequestStatus oldStatus = request.status;
        request.status = RequestStatus.Processing;
        
        emit RequestStatusUpdated(requestId, oldStatus, RequestStatus.Processing);
    }
    
    /**
     * @dev Admin completes conversion (after manual USDT transfer)
     * @param requestId ID of the request
     */
    function completeConversion(uint256 requestId) external onlyOwner {
        Request storage request = requests[requestId];
        require(request.exists, "ConversionRequest: Request does not exist");
        require(
            request.status == RequestStatus.Pending || request.status == RequestStatus.Processing,
            "ConversionRequest: Invalid status"
        );
        require(
            block.timestamp >= request.lockedUntil,
            "ConversionRequest: Conversion period not elapsed"
        );
        
        // Tokens are already locked in this contract
        // Admin should manually transfer USDT to requester before calling this
        // After calling, tokens remain in contract (can be burned later)
        
        RequestStatus oldStatus = request.status;
        request.status = RequestStatus.Completed;
        
        // Unlock balance (tokens stay in contract but are no longer counted as locked)
        lockedBalances[request.requester] -= request.vusdtAmount;
        
        emit ConversionCompleted(requestId, request.requester, request.vusdtAmount, request.vusdtAmount);
        emit RequestStatusUpdated(requestId, oldStatus, RequestStatus.Completed);
    }
    
    /**
     * @dev Admin cancels request (emergency only)
     * @param requestId ID of the request
     */
    function cancelRequest(uint256 requestId) external onlyOwner {
        Request storage request = requests[requestId];
        require(request.exists, "ConversionRequest: Request does not exist");
        require(request.status != RequestStatus.Completed, "ConversionRequest: Cannot cancel completed request");
        
        // Return tokens to requester
        require(
            vusdtToken.transfer(request.requester, request.vusdtAmount),
            "ConversionRequest: Token return failed"
        );
        
        // Unlock balance
        lockedBalances[request.requester] -= request.vusdtAmount;
        
        RequestStatus oldStatus = request.status;
        request.status = RequestStatus.Cancelled;
        
        emit RequestCancelled(requestId, request.requester);
        emit RequestStatusUpdated(requestId, oldStatus, RequestStatus.Cancelled);
    }
    
    /**
     * @dev Get request details
     * @param requestId ID of the request
     * @return Request details
     */
    function getRequest(uint256 requestId) external view returns (Request memory) {
        require(requests[requestId].exists, "ConversionRequest: Request does not exist");
        return requests[requestId];
    }
    
    /**
     * @dev Get user's request IDs
     * @param user Address of the user
     * @return Array of request IDs
     */
    function getUserRequests(address user) external view returns (uint256[] memory) {
        return userRequests[user];
    }
    
    /**
     * @dev Get locked balance for a user
     * @param user Address of the user
     * @return Locked VUSDT amount
     */
    function getLockedBalance(address user) external view returns (uint256) {
        return lockedBalances[user];
    }
    
    /**
     * @dev Check if user has locked tokens
     * @param user Address of the user
     * @return True if user has locked tokens
     */
    function hasLockedTokens(address user) external view returns (bool) {
        return lockedBalances[user] > 0;
    }
    
    /**
     * @dev Get all pending requests (for admin)
     * @param offset Starting index
     * @param limit Maximum number of requests to return
     * @return Array of request IDs and their details
     */
    function getPendingRequests(uint256 offset, uint256 limit) external view returns (uint256[] memory, Request[] memory) {
        uint256[] memory pendingIds = new uint256[](limit);
        Request[] memory pendingRequests = new Request[](limit);
        uint256 count = 0;
        
        for (uint256 i = offset; i < totalRequests && count < limit; i++) {
            if (requests[i].status == RequestStatus.Pending || requests[i].status == RequestStatus.Processing) {
                pendingIds[count] = i;
                pendingRequests[count] = requests[i];
                count++;
            }
        }
        
        // Resize arrays
        uint256[] memory resultIds = new uint256[](count);
        Request[] memory resultRequests = new Request[](count);
        
        for (uint256 i = 0; i < count; i++) {
            resultIds[i] = pendingIds[i];
            resultRequests[i] = pendingRequests[i];
        }
        
        return (resultIds, resultRequests);
    }
    
    /**
     * @dev Set treasury wallet address
     * @param _treasuryWallet New treasury wallet address
     */
    function setTreasuryWallet(address _treasuryWallet) external onlyOwner {
        require(_treasuryWallet != address(0), "ConversionRequest: Invalid address");
        address oldWallet = treasuryWallet;
        treasuryWallet = _treasuryWallet;
        emit TreasuryWalletUpdated(oldWallet, _treasuryWallet);
    }
    
    /**
     * @dev Get available balance for yield calculation (balance - locked)
     * @param user Address of the user
     * @return Available balance for yield
     */
    function getAvailableBalance(address user) external view returns (uint256) {
        uint256 totalBalance = vusdtToken.balanceOf(user);
        uint256 locked = lockedBalances[user];
        if (totalBalance >= locked) {
            return totalBalance - locked;
        }
        return 0;
    }
}

