import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';

const Hero = () => {
  const { t } = useTranslation();
  const { yieldDistributorContract } = useWeb3();
  const [annualAPY, setAnnualAPY] = useState('12');
  const [weeklyRate, setWeeklyRate] = useState('0.22');

  useEffect(() => {
    if (yieldDistributorContract) {
      loadYieldRate();
      const interval = setInterval(loadYieldRate, 30000);
      return () => clearInterval(interval);
    }
  }, [yieldDistributorContract]);

  const loadYieldRate = async () => {
    if (!yieldDistributorContract) return;
    try {
      const yieldRateBps = await yieldDistributorContract.weeklyYieldRateBps();
      const weekly = (Number(yieldRateBps) / 100).toFixed(2);
      const annual = ((Number(yieldRateBps) / 100) * 52).toFixed(2);
      setWeeklyRate(weekly);
      setAnnualAPY(annual);
    } catch (error) {
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error loading yield rate:', error);
      }
    }
  };

  return (
    <div className="hero-section">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-icon">🚀</span>
          <span>{t('hero.badge')}</span>
        </div>
        <h1 className="hero-title">
          <Trans i18nKey="hero.title" values={{ apy: annualAPY }} components={[<span className="highlight" />]} />
        </h1>
        <p className="hero-subtitle">
          <Trans i18nKey="hero.subtitle" components={[<br />, <strong />]} />
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="stat-number">1.2M+</div>
            <div className="stat-label">{t('hero.stats.activeUsers')}</div>
          </div>
          <div className="hero-stat">
            <div className="stat-number">{annualAPY}%</div>
            <div className="stat-label">{t('hero.stats.annualApy')}</div>
          </div>
          <div className="hero-stat">
            <div className="stat-number">$342M+</div>
            <div className="stat-label">{t('hero.stats.distributed')}</div>
          </div>
          <div className="hero-stat">
            <div className="stat-number">0%</div>
            <div className="stat-label">{t('hero.stats.fees')}</div>
          </div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="floating-card card-1">
          <div className="card-icon">💰</div>
          <div className="card-text">{t('hero.cards.compoundInterest')}</div>
        </div>
        <div className="floating-card card-2">
          <div className="card-icon">📈</div>
          <div className="card-text">{t('hero.cards.autoDistribution')}</div>
        </div>
        <div className="floating-card card-3">
          <div className="card-icon">🔒</div>
          <div className="card-text">{t('hero.cards.secureSafe')}</div>
        </div>
      </div>
    </div>
  );
};

export default Hero;

