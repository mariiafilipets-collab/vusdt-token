import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Contract addresses - should be set after deployment
const VUSDT_ADDRESS = process.env.REACT_APP_VUSDT_ADDRESS || '';
const YIELD_DISTRIBUTOR_ADDRESS = process.env.REACT_APP_YIELD_DISTRIBUTOR_ADDRESS || '';

// ABI for VUSDT Token
const VUSDT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// ABI for YieldDistributor
const YIELD_DISTRIBUTOR_ABI = [
  "function vusdtToken() view returns (address)",
  "function weeklyYieldRateBps() view returns (uint256)",
  "function lastDistributionTime() view returns (uint256)",
  "function distributionPaused() view returns (bool)",
  "function canDistribute() view returns (bool)",
  "function calculateYield(uint256 balance) view returns (uint256)",
  "function getHolderCount() view returns (uint256)",
  "function getHolder(uint256 index) view returns (address)",
  "function isRegisteredHolder(address) view returns (bool)",
  "function registerHolders(address[] addresses)",
  "function distributeYield()",
  "function pauseDistribution()",
  "function resumeDistribution()",
  "function setWeeklyYieldRate(uint256 newRate)",
  "event YieldDistributed(uint256 totalDistributed, uint256 holdersCount, uint256 timestamp)"
];

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [vusdtContract, setVusdtContract] = useState(null);
  const [yieldDistributorContract, setYieldDistributorContract] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState(null);

  // BNB Chain network IDs
  const BSC_MAINNET = 56;
  const BSC_TESTNET = 97;

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setChainId(currentChainId);
      setIsConnected(true);

      // Check if on correct network (BSC Mainnet)
      if (currentChainId !== BSC_MAINNET) {
        console.warn(`Connected to chain ${currentChainId}, but contracts are on BSC Mainnet (${BSC_MAINNET})`);
        // Don't initialize contracts if on wrong network
        return true;
      }

      // Initialize contracts only if on correct network
      if (VUSDT_ADDRESS) {
        const vusdt = new ethers.Contract(VUSDT_ADDRESS, VUSDT_ABI, signer);
        setVusdtContract(vusdt);
      }

      if (YIELD_DISTRIBUTOR_ADDRESS) {
        const distributor = new ethers.Contract(YIELD_DISTRIBUTOR_ADDRESS, YIELD_DISTRIBUTOR_ABI, signer);
        setYieldDistributorContract(distributor);
        console.log('YieldDistributor contract initialized:', {
          address: YIELD_DISTRIBUTOR_ADDRESS,
          hasRegisterHolders: typeof distributor.registerHolders === 'function'
        });
      }

      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Error connecting wallet: ' + error.message);
      return false;
    }
  };

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setVusdtContract(null);
    setYieldDistributorContract(null);
    setIsConnected(false);
    setChainId(null);
  };

  const switchToBSC = async (isTestnet = true) => {
    if (!window.ethereum) return;

    const targetChainId = isTestnet ? '0x61' : '0x38'; // BSC Testnet: 0x61 (97), Mainnet: 0x38 (56)
    const chainName = isTestnet ? 'BSC Testnet' : 'BNB Smart Chain';
    const rpcUrl = isTestnet 
      ? 'https://data-seed-prebsc-1-s1.binance.org:8545/'
      : 'https://bsc-dataseed.binance.org/';
    const blockExplorer = isTestnet 
      ? 'https://testnet.bscscan.com'
      : 'https://bscscan.com';

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetChainId,
              chainName: chainName,
              nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18,
              },
              rpcUrls: [rpcUrl],
              blockExplorerUrls: [blockExplorer],
            }],
          });
        } catch (addError) {
          console.error('Error adding chain:', addError);
          alert('Error adding network: ' + addError.message);
        }
      } else {
        console.error('Error switching chain:', switchError);
        alert('Error switching network: ' + switchError.message);
      }
    }
  };

  const switchToBSCTestnet = async () => {
    return switchToBSC(true);
  };

  const switchToBSCMainnet = async () => {
    return switchToBSC(false);
  };

  const getProvider = () => provider;
  const getSigner = () => signer;

  return {
    account,
    provider,
    signer,
    vusdtContract,
    yieldDistributorContract,
    isConnected,
    chainId,
    connectWallet,
    disconnect,
    switchToBSC,
    switchToBSCTestnet,
    switchToBSCMainnet,
    isBSC: chainId === BSC_MAINNET || chainId === BSC_TESTNET,
    isBSCTestnet: chainId === BSC_TESTNET,
    isBSCMainnet: chainId === BSC_MAINNET,
    BSC_TESTNET,
    BSC_MAINNET,
    getProvider,
    getSigner,
  };
};

