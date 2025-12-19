import React from 'react';
import { useTranslation } from 'react-i18next';

const Features = () => {
  const { t } = useTranslation();
  const features = [
    {
      icon: '⚡',
      titleKey: 'features.automaticDistribution.title',
      descriptionKey: 'features.automaticDistribution.description',
      color: 'var(--binance-yellow)'
    },
    {
      icon: '📊',
      titleKey: 'features.compoundInterest.title',
      descriptionKey: 'features.compoundInterest.description',
      color: 'var(--binance-success)'
    },
    {
      icon: '🔐',
      titleKey: 'features.fullyDecentralized.title',
      descriptionKey: 'features.fullyDecentralized.description',
      color: 'var(--binance-info)'
    },
    {
      icon: '💎',
      titleKey: 'features.noLockup.title',
      descriptionKey: 'features.noLockup.description',
      color: 'var(--binance-yellow)'
    },
    {
      icon: '🌐',
      titleKey: 'features.lowGasFees.title',
      descriptionKey: 'features.lowGasFees.description',
      color: 'var(--binance-success)'
    },
    {
      icon: '📱',
      titleKey: 'features.easyToUse.title',
      descriptionKey: 'features.easyToUse.description',
      color: 'var(--binance-info)'
    }
  ];

  return (
    <div className="features-section">
      <div className="section-header">
        <h2>{t('features.title')}</h2>
        <p>{t('features.subtitle')}</p>
      </div>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon" style={{ background: `${feature.color}20`, color: feature.color }}>
              {feature.icon}
            </div>
            <h3>{t(feature.titleKey)}</h3>
            <p>{t(feature.descriptionKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Features;

