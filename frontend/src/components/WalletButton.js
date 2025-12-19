import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';

const WalletButton = () => {
  const { t } = useTranslation();
  const { 
    account, 
    isConnected, 
    connectWallet, 
    disconnect, 
    isBSCTestnet,
    isBSCMainnet,
    switchToBSCTestnet,
    switchToBSCMainnet,
    chainId 
  } = useWeb3();
  const [showMenu, setShowMenu] = useState(false);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <button className="wallet-button" onClick={connectWallet}>
        {t('wallet.connect')}
      </button>
    );
  }

  return (
    <div className="wallet-button-container">
      {!isBSCMainnet && (
        <button 
          className="wallet-button wallet-button-warning"
          onClick={isBSCTestnet ? switchToBSCMainnet : connectWallet}
          style={{ marginRight: '8px' }}
        >
          {isBSCTestnet ? 'Switch to Mainnet' : t('wallet.wrongNetwork')}
        </button>
      )}
      <div className="wallet-button-wrapper">
        <button 
          className="wallet-button wallet-button-connected"
          onClick={() => setShowMenu(!showMenu)}
        >
          <span className="wallet-status-dot"></span>
          {formatAddress(account)}
        </button>
        {showMenu && (
          <div className="wallet-menu">
            <div className="wallet-menu-item">
              <span className="wallet-menu-label">{t('wallet.address')}</span>
              <span className="wallet-menu-value">{account}</span>
            </div>
            <div className="wallet-menu-item">
              <span className="wallet-menu-label">{t('wallet.network')}</span>
              <span className="wallet-menu-value">
                {chainId === 97 ? t('wallet.bscTestnet') : chainId === 56 ? t('wallet.bscMainnet') : `Chain ${chainId}`}
              </span>
            </div>
            <div className="wallet-menu-divider"></div>
            <button className="wallet-menu-button" onClick={disconnect}>
              {t('wallet.disconnect')}
            </button>
          </div>
        )}
      </div>
      {showMenu && (
        <div className="wallet-menu-overlay" onClick={() => setShowMenu(false)}></div>
      )}
    </div>
  );
};

export default WalletButton;

