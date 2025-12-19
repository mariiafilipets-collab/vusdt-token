// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VUSDT Token
 * @dev ERC-20 token with minting capability and pause functionality
 * @notice This token can be minted by the owner and the YieldDistributor contract
 */
contract VUSDT is ERC20, ERC20Pausable, Ownable {
    // Address of the YieldDistributor contract that can mint tokens
    address public yieldDistributor;

    // Events
    event YieldDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @dev Constructor that initializes the token
     * @param initialOwner Address that will own the contract
     */
    constructor(address initialOwner) ERC20("VUSDT Token", "VUSDT") Ownable(initialOwner) {
        // Token starts unpaused
    }

    // Address of the Purchase contract that can mint tokens
    address public purchaseContract;

    /**
     * @dev Modifier to check if the caller is authorized to mint
     */
    modifier onlyMinter() {
        require(
            msg.sender == owner() || 
            msg.sender == yieldDistributor || 
            msg.sender == purchaseContract,
            "VUSDT: Only owner, yield distributor, or purchase contract can mint"
        );
        _;
    }

    /**
     * @dev Sets the YieldDistributor contract address
     * @param _yieldDistributor Address of the YieldDistributor contract
     */
    function setYieldDistributor(address _yieldDistributor) external onlyOwner {
        require(_yieldDistributor != address(0), "VUSDT: Invalid address");
        address oldDistributor = yieldDistributor;
        yieldDistributor = _yieldDistributor;
        emit YieldDistributorUpdated(oldDistributor, _yieldDistributor);
    }

    /**
     * @dev Sets the Purchase contract address
     * @param _purchaseContract Address of the Purchase contract
     */
    function setPurchaseContract(address _purchaseContract) external onlyOwner {
        require(_purchaseContract != address(0), "VUSDT: Invalid address");
        purchaseContract = _purchaseContract;
    }

    /**
     * @dev Mints tokens to a specified address
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "VUSDT: Cannot mint to zero address");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Pauses all token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override required by Solidity for ERC20Pausable
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}

