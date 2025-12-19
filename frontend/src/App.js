import React from 'react';
import './index.css';
import { useTranslation } from 'react-i18next';
import Hero from './components/Hero';
import Stats from './components/Stats';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import WalletButton from './components/WalletButton';
import LanguageSwitcher from './components/LanguageSwitcher';
import BalanceDisplay from './components/BalanceDisplay';
import TransferTokens from './components/TransferTokens';
import PurchaseVUSDT from './components/PurchaseVUSDT';
import ConversionRequest from './components/ConversionRequest';
import YieldInfo from './components/YieldInfo';
import AdminPanel from './components/AdminPanel';
import CTASection from './components/CTASection';
import { useOwner } from './hooks/useOwner';

function App() {
  const { isOwner } = useOwner();
  const { t } = useTranslation();

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">{t('nav.brand')}</div>
        <div style={{ color: 'var(--binance-text-secondary)', fontSize: '14px' }}>
          {t('nav.earnApy')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSwitcher />
          <WalletButton />
        </div>
      </nav>

      <Hero />
      <Stats />
      
      <div className="container">
        <Features />
        <HowItWorks />
        
        <div className="interactive-section">
          <h2 className="section-title">{t('dashboard.title')}</h2>
          
          <div className="grid">
            <BalanceDisplay />
            <YieldInfo />
          </div>
          
          <PurchaseVUSDT />
          <ConversionRequest />
          <TransferTokens />
          {isOwner && <AdminPanel />}
        </div>

        <CTASection />
      </div>
    </div>
  );
}

export default App;
