import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';

const TransferTokens = () => {
  const { t } = useTranslation();
  const { vusdtContract, isConnected } = useWeb3();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!vusdtContract || !isConnected) {
      alert(t('transfer.connectWallet'));
      return;
    }

    if (!recipient || !amount) {
      alert(t('transfer.fillAllFields'));
      return;
    }

    if (!ethers.isAddress(recipient)) {
      alert(t('transfer.invalidAddress'));
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await vusdtContract.transfer(recipient, amountWei);
      setStatus({ type: 'info', message: t('transfer.transactionSent', { hash: tx.hash }) });
      
      const receipt = await tx.wait();
      setStatus({ 
        type: 'success', 
        message: t('transfer.transferSuccessful', { block: receipt.blockNumber })
      });
      
      setRecipient('');
      setAmount('');
    } catch (error) {
      console.error('Transfer error:', error);
      setStatus({ 
        type: 'error', 
        message: error.reason || error.message || t('transfer.transferFailed')
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>{t('transfer.titleNotConnected')}</h2>
        <p>{t('transfer.notConnected')}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{t('transfer.title')}</h2>
      <form onSubmit={handleTransfer}>
        <label className="label">{t('transfer.recipientLabel')}</label>
        <input
          type="text"
          className="input"
          placeholder={t('transfer.recipientPlaceholder')}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          disabled={loading}
        />
        
        <label className="label">{t('transfer.amountLabel')}</label>
        <input
          type="number"
          className="input"
          placeholder={t('transfer.amountPlaceholder')}
          step="0.000001"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
        />
        
        {status && (
          <div className={`status status-${status.type}`}>
            {status.message}
          </div>
        )}
        
        <button 
          type="submit" 
          className="button" 
          disabled={loading || !recipient || !amount}
          style={{ width: '100%' }}
        >
          {loading ? t('common.processing') : t('transfer.transferButton')}
        </button>
      </form>
    </div>
  );
};

export default TransferTokens;

