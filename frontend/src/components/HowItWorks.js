import React from 'react';
import { useTranslation } from 'react-i18next';

const HowItWorks = () => {
  const { t } = useTranslation();
  const steps = [
    {
      number: '01',
      titleKey: 'howItWorks.step1.title',
      descriptionKey: 'howItWorks.step1.description',
      icon: '🎯'
    },
    {
      number: '02',
      titleKey: 'howItWorks.step2.title',
      descriptionKey: 'howItWorks.step2.description',
      icon: '📝'
    },
    {
      number: '03',
      titleKey: 'howItWorks.step3.title',
      descriptionKey: 'howItWorks.step3.description',
      icon: '💰'
    },
    {
      number: '04',
      titleKey: 'howItWorks.step4.title',
      descriptionKey: 'howItWorks.step4.description',
      icon: '📈'
    }
  ];

  return (
    <div className="how-it-works-section">
      <div className="section-header">
        <h2>{t('howItWorks.title')}</h2>
        <p>{t('howItWorks.subtitle')}</p>
      </div>
      <div className="steps-container">
        {steps.map((step, index) => (
          <div key={index} className="step-card">
            <div className="step-number">{step.number}</div>
            <div className="step-icon">{step.icon}</div>
            <h3>{t(step.titleKey)}</h3>
            <p>{t(step.descriptionKey)}</p>
            {index < steps.length - 1 && <div className="step-arrow">→</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;

