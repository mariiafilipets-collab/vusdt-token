import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';

const PurchaseVUSDT = () => {
  const { t } = useTranslation();
  const { account, isConnected, isBSCMainnet, signer } = useWeb3();
  const [usdtAmount, setUsdtAmount] = useState('');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [usdtAllowance, setUsdtAllowance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [purchaseContract, setPurchaseContract] = useState(null);
  const [usdtContract, setUsdtContract] = useState(null);

  // Contract addresses
  const PURCHASE_CONTRACT_ADDRESS = process.env.REACT_APP_PURCHASE_CONTRACT_ADDRESS || '';
  const USDT_TOKEN_ADDRESS = process.env.REACT_APP_USDT_TOKEN_ADDRESS || '';

  // Debug: Log environment variables on component mount
  useEffect(() => {
    console.log('=== PurchaseVUSDT Environment Variables ===');
    console.log('REACT_APP_PURCHASE_CONTRACT_ADDRESS:', process.env.REACT_APP_PURCHASE_CONTRACT_ADDRESS);
    console.log('REACT_APP_USDT_TOKEN_ADDRESS:', process.env.REACT_APP_USDT_TOKEN_ADDRESS);
    console.log('PURCHASE_CONTRACT_ADDRESS:', PURCHASE_CONTRACT_ADDRESS);
    console.log('USDT_TOKEN_ADDRESS:', USDT_TOKEN_ADDRESS);
    console.log('==========================================');
  }, []);

  // ABI for Purchase Contract
  const PURCHASE_ABI = [
    "function purchaseVUSDT(uint256 usdtAmount) external",
    "function totalPurchased() view returns (uint256)",
    "function totalUSDTReceived() view returns (uint256)",
    "function userPurchases(address) view returns (uint256)",
    "function centralWallet() view returns (address)",
    "event VUSDTPurchased(address indexed buyer, uint256 usdtAmount, uint256 vusdtAmount, uint256 timestamp)"
  ];

  // ABI for USDT (BEP-20)
  const USDT_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];

  useEffect(() => {
    if (isConnected && account && signer && PURCHASE_CONTRACT_ADDRESS && USDT_TOKEN_ADDRESS) {
      initializeContracts();
    }
  }, [isConnected, account, signer, PURCHASE_CONTRACT_ADDRESS, USDT_TOKEN_ADDRESS]);

  const initializeContracts = async () => {
    if (!signer) return;
    
    try {
      if (PURCHASE_CONTRACT_ADDRESS) {
        const purchase = new ethers.Contract(PURCHASE_CONTRACT_ADDRESS, PURCHASE_ABI, signer);
        setPurchaseContract(purchase);
      }

      if (USDT_TOKEN_ADDRESS) {
        const usdt = new ethers.Contract(USDT_TOKEN_ADDRESS, USDT_ABI, signer);
        setUsdtContract(usdt);
        loadUSDTBalance();
        
        // Poll for balance updates
        const interval = setInterval(loadUSDTBalance, 10000);
        return () => clearInterval(interval);
      }
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  };

  const loadUSDTBalance = async () => {
    if (!usdtContract || !account) return;
    try {
      const balance = await usdtContract.balanceOf(account);
      const decimals = await usdtContract.decimals().catch(() => 18);
      setUsdtBalance(ethers.formatUnits(balance, decimals));
      
      if (PURCHASE_CONTRACT_ADDRESS) {
        const allowance = await usdtContract.allowance(account, PURCHASE_CONTRACT_ADDRESS);
        setUsdtAllowance(ethers.formatUnits(allowance, decimals));
      }
    } catch (error) {
      // Silently handle RPC errors
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error loading USDT balance:', error);
      }
    }
  };

  // Poll for balance updates
  useEffect(() => {
    if (usdtContract && account) {
      loadUSDTBalance();
      const interval = setInterval(loadUSDTBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [usdtContract, account]);

  const handleApprove = async () => {
    if (!usdtContract || !account || !PURCHASE_CONTRACT_ADDRESS) return;
    
    setLoading(true);
    setStatus(null);
    
    try {
      const amount = ethers.parseUnits(usdtAmount || "1000000", 18); // Approve large amount
      const tx = await usdtContract.approve(PURCHASE_CONTRACT_ADDRESS, amount);
      setStatus({ type: 'info', message: `Approval transaction sent: ${tx.hash}` });
      await tx.wait();
      setStatus({ type: 'success', message: 'USDT approved successfully!' });
      loadUSDTBalance();
    } catch (error) {
      console.error('Approval error:', error);
      setStatus({ type: 'error', message: error.reason || error.message || 'Approval failed' });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseContract || !usdtContract || !account) {
      alert('Please connect your wallet and ensure contracts are loaded');
      return;
    }

    if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const decimals = await usdtContract.decimals().catch(() => 18);
      const amount = ethers.parseUnits(usdtAmount, decimals);
      
      // Check balance
      const balance = await usdtContract.balanceOf(account);
      if (balance < amount) {
        throw new Error('Insufficient USDT balance');
      }

      // Check allowance
      const allowance = await usdtContract.allowance(account, PURCHASE_CONTRACT_ADDRESS);
      if (allowance < amount) {
        setStatus({ type: 'error', message: t('purchase.needApproval') });
        setLoading(false);
        return;
      }

      // Purchase VUSDT
      const tx = await purchaseContract.purchaseVUSDT(amount);
      setStatus({ type: 'info', message: t('common.processing') + `: ${tx.hash}` });
      
      const receipt = await tx.wait();
      setStatus({ 
        type: 'success', 
        message: t('purchase.purchaseButton', { amount: usdtAmount }) + `! Block: ${receipt.blockNumber}`
      });
      
      setUsdtAmount('');
      loadUSDTBalance();
    } catch (error) {
      console.error('Purchase error:', error);
      const errorMessage = error.reason || error.message || 'Purchase failed';
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>{t('purchase.title')}</h2>
        <p>{t('purchase.connectWallet')}</p>
      </div>
    );
  }


  if (!PURCHASE_CONTRACT_ADDRESS || !USDT_TOKEN_ADDRESS) {
    return (
      <div className="card">
        <h2>{t('purchase.title')}</h2>
        <div className="status status-info">
          <p><strong>{t('purchase.notConfigured')}</strong></p>
          <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--binance-text-secondary)' }}>
            Missing configuration:
          </p>
          <ul style={{ fontSize: '12px', marginTop: '8px', paddingLeft: '20px', color: 'var(--binance-text-secondary)' }}>
            {!PURCHASE_CONTRACT_ADDRESS && <li>REACT_APP_PURCHASE_CONTRACT_ADDRESS</li>}
            {!USDT_TOKEN_ADDRESS && <li>REACT_APP_USDT_TOKEN_ADDRESS</li>}
          </ul>
          <p style={{ fontSize: '12px', marginTop: '12px', color: 'var(--binance-text-secondary)' }}>
            Please add these to <code>frontend/.env</code> and restart the frontend.
          </p>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--binance-dark-tertiary)', borderRadius: '4px', fontSize: '12px' }}>
            <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Required values:</p>
            <code style={{ display: 'block', marginBottom: '4px' }}>
              REACT_APP_PURCHASE_CONTRACT_ADDRESS=0xA4DB84870c79E531ea68075e9a503282BE6087c4
            </code>
            <code style={{ display: 'block' }}>
              REACT_APP_USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
            </code>
          </div>
        </div>
      </div>
    );
  }

  const needsApproval = parseFloat(usdtAmount) > 0 && parseFloat(usdtAllowance) < parseFloat(usdtAmount);

  return (
    <div className="card">
      <h2>{t('purchase.title')}</h2>
      <p style={{ color: 'var(--binance-text-secondary)', marginBottom: '20px' }}>
        {t('purchase.description')}
      </p>

      {usdtContract && (
        <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--binance-dark-tertiary)', borderRadius: '4px', border: '1px solid var(--binance-border)' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>{t('purchase.usdtBalance')}</strong> {parseFloat(usdtBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT
          </p>
          <p style={{ fontSize: '12px', color: 'var(--binance-text-secondary)' }}>
            {t('purchase.approved')} {parseFloat(usdtAllowance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT
          </p>
        </div>
      )}

      {status && (
        <div className={`status status-${status.type}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handlePurchase}>
        <label className="label">{t('purchase.amountLabel')}</label>
        <input
          type="number"
          className="input"
          placeholder="0.0"
          step="0.000001"
          min="0"
          value={usdtAmount}
          onChange={(e) => setUsdtAmount(e.target.value)}
          disabled={loading}
        />
        <p style={{ fontSize: '12px', color: 'var(--binance-text-secondary)', marginBottom: '16px' }}>
          {t('purchase.youWillReceive', { amount: usdtAmount || '0' })}
        </p>

        {needsApproval && (
          <div className="status status-info" style={{ marginBottom: '16px' }}>
            <p>{t('purchase.needApproval')}</p>
            <button
              type="button"
              className="button"
              onClick={handleApprove}
              disabled={loading}
              style={{ marginTop: '10px', width: '100%' }}
            >
              {loading ? t('common.processing') : t('purchase.approveButton')}
            </button>
          </div>
        )}

        <button
          type="submit"
          className="button"
          disabled={loading || !usdtAmount || parseFloat(usdtAmount) <= 0 || needsApproval}
          style={{ width: '100%' }}
        >
          {loading ? t('common.processing') : t('purchase.purchaseButton', { amount: usdtAmount || '0' })}
        </button>
      </form>
    </div>
  );
};

export default PurchaseVUSDT;

