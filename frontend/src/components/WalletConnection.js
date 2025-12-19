import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';

const WalletConnection = () => {
  const { 
    account, 
    isConnected, 
    connectWallet, 
    disconnect, 
    isBSC, 
    isBSCTestnet,
    isBSCMainnet,
    switchToBSCTestnet, 
    switchToBSCMainnet,
    chainId 
  } = useWeb3();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = () => {
    if (chainId === 97) return 'BSC Testnet';
    if (chainId === 56) return 'BSC Mainnet';
    return `Chain ID: ${chainId}`;
  };

  return (
    <div className="card">
      <h2>Wallet Connection</h2>
      {!isConnected ? (
        <div>
          <p>Connect your MetaMask wallet to interact with VUSDT</p>
          <p style={{ fontSize: '14px', color: 'var(--binance-text-secondary)', marginTop: '10px' }}>
            <strong>Note:</strong> Contracts are deployed on <strong>BSC Testnet</strong>
          </p>
          <button className="button" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <div>
          <div className="status status-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              background: 'var(--binance-success)', 
              borderRadius: '50%',
              display: 'inline-block'
            }}></span>
            <strong>Connected:</strong> {formatAddress(account)}
          </div>
          
          {!isBSC && (
            <div className="status status-error">
              <p><strong>Wrong Network!</strong></p>
              <p>Please switch to <strong>BSC Testnet</strong> (Chain ID: 97)</p>
              <button className="button" onClick={switchToBSCTestnet} style={{ marginTop: '10px' }}>
                Switch to BSC Testnet
              </button>
            </div>
          )}

          {isBSCMainnet && (
            <div className="status status-info">
              <p><strong>⚠️ You are on BSC Mainnet</strong></p>
              <p>Contracts are deployed on <strong>BSC Testnet</strong>. Please switch:</p>
              <button className="button" onClick={switchToBSCTestnet} style={{ marginTop: '10px' }}>
                Switch to BSC Testnet
              </button>
            </div>
          )}

          {isBSCTestnet && (
            <div className="status status-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                background: 'var(--binance-success)', 
                borderRadius: '50%',
                display: 'inline-block'
              }}></span>
              <div>
                <strong>Network: BSC Testnet</strong> (Chain ID: 97)
                <br />
                <span style={{ fontSize: '12px', color: 'var(--binance-text-secondary)' }}>This is the correct network!</span>
              </div>
            </div>
          )}

          {isBSC && !isBSCTestnet && !isBSCMainnet && (
            <div className="status status-info">
              Network: {getNetworkName()}
            </div>
          )}

          <button className="button" onClick={disconnect} style={{ marginTop: '10px' }}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;

