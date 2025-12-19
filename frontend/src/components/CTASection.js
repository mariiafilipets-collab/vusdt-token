import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

const CTASection = () => {
  const { t } = useTranslation();
  return (
    <div className="cta-section">
      <div className="cta-content">
        <h2>{t('cta.title')}</h2>
        <p><Trans i18nKey="cta.subtitle" components={[<strong />]} /></p>
        <div className="cta-features">
          <div className="cta-feature">
            <span className="check-icon">✓</span>
            <span>{t('cta.noMinimum')}</span>
          </div>
          <div className="cta-feature">
            <span className="check-icon">✓</span>
            <span>{t('cta.noLockup')}</span>
          </div>
          <div className="cta-feature">
            <span className="check-icon">✓</span>
            <span>{t('cta.automatic')}</span>
          </div>
        </div>
        <div className="cta-note">
          <p><Trans i18nKey="cta.proTip" components={[<strong />]} /></p>
        </div>
      </div>
    </div>
  );
};

export default CTASection;

