import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';

const BalanceDisplay = () => {
  const { t } = useTranslation();
  const { account, vusdtContract, yieldDistributorContract, isConnected } = useWeb3();
  const [balance, setBalance] = useState('0');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (isConnected && vusdtContract && account) {
      loadBalance();
      checkRegistration();
      
      // Use polling instead of event filters to avoid RPC limit errors
      const interval = setInterval(() => {
        loadBalance();
        checkRegistration();
      }, 10000); // Poll every 10 seconds

      return () => {
        clearInterval(interval);
      };
    }
  }, [isConnected, vusdtContract, yieldDistributorContract, account]);

  const loadBalance = async () => {
    if (!vusdtContract || !account) return;
    try {
      const bal = await vusdtContract.balanceOf(account);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      // Silently handle RPC errors to avoid console spam
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error loading balance:', error);
      }
    }
  };

  const checkRegistration = async () => {
    if (!account || !yieldDistributorContract) return;
    try {
      const registered = await yieldDistributorContract.isRegisteredHolder(account);
      setIsRegistered(registered);
    } catch (error) {
      // Silently handle RPC errors to avoid console spam
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error checking registration:', error);
      }
    }
  };

  const registerAsHolder = async () => {
    if (!account) {
      alert(t('balance.connectWalletFirst'));
      return;
    }
    
    if (!yieldDistributorContract) {
      alert(t('balance.contractNotLoaded'));
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      // Debug: Check contract
      console.log('YieldDistributor contract:', yieldDistributorContract);
      console.log('Contract address:', yieldDistributorContract.target);
      console.log('Account:', account);
      
      // Call the function directly
      const tx = await yieldDistributorContract.registerHolders([account]);
      setStatus({ type: 'info', message: t('balance.transactionSent', { hash: tx.hash }) });
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      setIsRegistered(true);
      setStatus({ type: 'success', message: t('balance.successfullyRegistered', { block: receipt.blockNumber }) });
      
      // Reload after a short delay
      setTimeout(() => {
        loadBalance();
        checkRegistration();
      }, 2000);
    } catch (error) {
      console.error('Error registering:', error);
      console.error('Error details:', {
        code: error.code,
        reason: error.reason,
        message: error.message,
        data: error.data
      });
      
      let errorMessage = t('balance.failedToRegister', { reason: error.reason || error.message || '' });
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>{t('balance.titleNotConnected')}</h2>
        <p>{t('balance.notConnected')}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{t('balance.title')}</h2>
      <div className="balance-display">{parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} VUSDT</div>
      {status && (
        <div className={`status status-${status.type}`}>
          {status.message}
        </div>
      )}
      
      {parseFloat(balance) > 0 && !isRegistered && (
        <div className="status status-info">
          <p>{t('balance.notRegistered')}</p>
          {!yieldDistributorContract && (
            <p style={{ fontSize: '12px', color: 'var(--binance-text-tertiary)', marginTop: '8px' }}>
              {t('balance.notRegisteredWarning')}
            </p>
          )}
          <button 
            className="button" 
            onClick={registerAsHolder} 
            disabled={loading || !yieldDistributorContract}
            style={{ marginTop: '12px', width: '100%' }}
          >
            {loading ? t('balance.registering') : t('balance.registerButton')}
          </button>
        </div>
      )}
      {isRegistered && (
        <div className="status status-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            background: 'var(--binance-success)', 
            borderRadius: '50%',
            display: 'inline-block'
          }}></span>
          <span>{t('balance.registered')}</span>
        </div>
      )}
    </div>
  );
};

export default BalanceDisplay;

