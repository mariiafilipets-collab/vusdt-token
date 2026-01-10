import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';

const YieldInfo = () => {
  const { t } = useTranslation();
  const { account, vusdtContract, yieldDistributorContract, isConnected } = useWeb3();
  const [balance, setBalance] = useState('0');
  const [nextYield, setNextYield] = useState('0');
  const [weeklyYieldRate, setWeeklyYieldRate] = useState('0.22');
  const [annualAPY, setAnnualAPY] = useState('12');

  useEffect(() => {
    if (isConnected && vusdtContract && account) {
      loadData();
      
      // Use polling instead of event listeners to avoid RPC limit errors
      const interval = setInterval(() => {
        loadData();
      }, 15000); // Poll every 15 seconds

      return () => {
        clearInterval(interval);
      };
    }
  }, [isConnected, vusdtContract, account]);

  const loadData = async () => {
    if (!vusdtContract || !yieldDistributorContract || !account) return;
    
    try {
      const bal = await vusdtContract.balanceOf(account);
      setBalance(ethers.formatEther(bal));
      
      if (yieldDistributorContract) {
        const yieldAmount = await yieldDistributorContract.calculateYield(bal);
        setNextYield(ethers.formatEther(yieldAmount));
        
        // Load current yield rate
        const yieldRateBps = await yieldDistributorContract.weeklyYieldRateBps();
        const weeklyRate = (Number(yieldRateBps) / 100).toFixed(2);
        const annualRate = ((Number(yieldRateBps) / 100) * 52).toFixed(2);
        setWeeklyYieldRate(weeklyRate);
        setAnnualAPY(annualRate);
      }
    } catch (error) {
      // Silently handle RPC errors to avoid console spam
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error loading data:', error);
      }
    }
  };

  return (
    <div className="card">
      <h2>{t('yieldInfo.title')}</h2>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="stats-card">
            <div className="stats-value" style={{ color: 'var(--binance-success)' }}>{annualAPY}%</div>
            <div className="stats-label">{t('yieldInfo.annualApy')}</div>
          </div>
          <div className="stats-card">
            <div className="stats-value" style={{ color: 'var(--binance-yellow)' }}>{weeklyYieldRate}%</div>
            <div className="stats-label">{t('yieldInfo.weeklyRate')}</div>
          </div>
        </div>
        <div style={{ padding: '16px', background: 'var(--binance-dark-tertiary)', borderRadius: '4px', border: '1px solid var(--binance-border)' }}>
          <p style={{ margin: 0, color: 'var(--binance-text-secondary)' }}><strong style={{ color: 'var(--binance-text-primary)' }}>{t('yieldInfo.distribution')}</strong> {t('yieldInfo.distributionTime')}</p>
        </div>
      </div>
      
      {isConnected && parseFloat(balance) > 0 && (
        <div className="status status-info" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span><strong>{t('yieldInfo.yourNextYield')}</strong></span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--binance-yellow)' }}>
              {parseFloat(nextYield).toFixed(6)} VUSDT
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--binance-text-secondary)', marginTop: '8px' }}>
            {t('yieldInfo.basedOnBalance', { balance: parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) })}
          </p>
        </div>
      )}
    </div>
  );
};

export default YieldInfo;

