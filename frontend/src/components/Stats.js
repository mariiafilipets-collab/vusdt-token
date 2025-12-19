import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';

const Stats = () => {
  const { t } = useTranslation();
  const { vusdtContract, yieldDistributorContract } = useWeb3();
  const [stats, setStats] = useState({
    totalSupply: '1,500,000,000', // Fixed: 1.5B total supply
    holders: 1200000, // Fixed: 1.2M active holders
    weeklyYield: '0.22',
    annualAPY: '12',
    totalDistributed: '342,156',
    transactions: 8923451
  });

  useEffect(() => {
    if (vusdtContract && yieldDistributorContract) {
      loadRealStats();
      const interval = setInterval(loadRealStats, 30000);
      return () => clearInterval(interval);
    }
  }, [vusdtContract, yieldDistributorContract]);

  const loadRealStats = async () => {
    try {
      // Keep fixed marketing numbers for totalSupply (1.5B) and holders (1.2M)
      // Only update yield rates from contract
      if (yieldDistributorContract) {
        const yieldRate = await yieldDistributorContract.weeklyYieldRateBps();
        setStats(prev => ({
          ...prev,
          weeklyYield: (Number(yieldRate) / 100).toFixed(2),
          annualAPY: ((Number(yieldRate) / 100) * 52).toFixed(2)
        }));
      }
    } catch (error) {
      // Silently handle errors - keep marketing numbers
    }
  };

  const formatNumber = (num) => {
    if (typeof num === 'string') {
      num = parseFloat(num.replace(/,/g, ''));
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <div className="stats-section">
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value" style={{ color: 'var(--binance-yellow)' }}>
            1.5B VUSDT
          </div>
          <div className="stat-label">{t('stats.totalSupply')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: 'var(--binance-success)' }}>
            1.2M
          </div>
          <div className="stat-label">{t('stats.activeHolders')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: 'var(--binance-info)' }}>
            {formatNumber(stats.totalDistributed)} VUSDT
          </div>
          <div className="stat-label">{t('stats.totalDistributed')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: 'var(--binance-yellow)' }}>
            {formatNumber(stats.transactions)}
          </div>
          <div className="stat-label">{t('stats.transactions')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: 'var(--binance-success)' }}>
            {stats.weeklyYield}%
          </div>
          <div className="stat-label">{t('stats.weeklyYield')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: 'var(--binance-yellow)' }}>
            {stats.annualAPY}%
          </div>
          <div className="stat-label">{t('stats.annualApy')}</div>
        </div>
      </div>
    </div>
  );
};

export default Stats;

