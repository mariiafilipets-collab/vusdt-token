import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';

const ConversionRequest = () => {
  const { t } = useTranslation();
  const { account, isConnected, signer } = useWeb3();
  const [vusdtAmount, setVusdtAmount] = useState('');
  const [vusdtBalance, setVusdtBalance] = useState('0');
  const [lockedBalance, setLockedBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [conversionContract, setConversionContract] = useState(null);
  const [userRequests, setUserRequests] = useState([]);

  const CONVERSION_CONTRACT_ADDRESS = process.env.REACT_APP_CONVERSION_CONTRACT_ADDRESS || '';

  const CONVERSION_ABI = [
    "function requestConversion(uint256 vusdtAmount) external returns (uint256)",
    "function getRequest(uint256 requestId) view returns (tuple(address requester, uint256 vusdtAmount, uint256 requestedAt, uint256 lockedUntil, uint8 status, bool exists))",
    "function getUserRequests(address user) view returns (uint256[])",
    "function getLockedBalance(address user) view returns (uint256)",
    "function CONVERSION_PERIOD() view returns (uint256)",
    "event ConversionRequested(uint256 indexed requestId, address indexed requester, uint256 vusdtAmount, uint256 requestedAt, uint256 lockedUntil)"
  ];

  const VUSDT_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  useEffect(() => {
    if (isConnected && account && signer && CONVERSION_CONTRACT_ADDRESS) {
      initializeContracts();
    }
  }, [isConnected, account, signer, CONVERSION_CONTRACT_ADDRESS]);

  const initializeContracts = async () => {
    if (!signer) return;
    
    try {
      const conversion = new ethers.Contract(CONVERSION_CONTRACT_ADDRESS, CONVERSION_ABI, signer);
      setConversionContract(conversion);
      
      const vusdtAddress = process.env.REACT_APP_VUSDT_ADDRESS;
      if (vusdtAddress) {
        const vusdt = new ethers.Contract(vusdtAddress, VUSDT_ABI, signer);
        loadBalances(vusdt, conversion);
        loadUserRequests(conversion);
        
        const interval = setInterval(() => {
          loadBalances(vusdt, conversion);
          loadUserRequests(conversion);
        }, 10000);
        return () => clearInterval(interval);
      }
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  };

  const loadBalances = async (vusdt, conversion) => {
    if (!account) return;
    try {
      const balance = await vusdt.balanceOf(account);
      setVusdtBalance(ethers.formatEther(balance));
      
      const locked = await conversion.getLockedBalance(account);
      setLockedBalance(ethers.formatEther(locked));
    } catch (error) {
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error loading balances:', error);
      }
    }
  };

  const loadUserRequests = async (conversion) => {
    if (!account) return;
    try {
      const requestIds = await conversion.getUserRequests(account);
      const requests = await Promise.all(
        requestIds.map(async (id) => {
          const request = await conversion.getRequest(id);
          return {
            id: Number(id),
            amount: ethers.formatEther(request.vusdtAmount),
            requestedAt: new Date(Number(request.requestedAt) * 1000),
            lockedUntil: new Date(Number(request.lockedUntil) * 1000),
            status: ['Pending', 'Processing', 'Completed', 'Cancelled'][request.status]
          };
        })
      );
      setUserRequests(requests.sort((a, b) => b.id - a.id));
    } catch (error) {
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error loading requests:', error);
      }
    }
  };

  const handleRequestConversion = async (e) => {
    e.preventDefault();
    if (!conversionContract || !account) {
      alert('Please connect your wallet');
      return;
    }

    if (!vusdtAmount || parseFloat(vusdtAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const availableBalance = parseFloat(vusdtBalance) - parseFloat(lockedBalance);
    if (parseFloat(vusdtAmount) > availableBalance) {
      alert(`Insufficient available balance. Available: ${availableBalance.toFixed(6)} VUSDT`);
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const vusdtAddress = process.env.REACT_APP_VUSDT_ADDRESS;
      const vusdt = new ethers.Contract(vusdtAddress, VUSDT_ABI, signer);
      
      const amount = ethers.parseEther(vusdtAmount);
      
      // Check and approve if needed
      const allowance = await vusdt.allowance(account, CONVERSION_CONTRACT_ADDRESS);
      if (allowance < amount) {
        const approveTx = await vusdt.approve(CONVERSION_CONTRACT_ADDRESS, amount);
        setStatus({ type: 'info', message: `Approval transaction sent: ${approveTx.hash}` });
        await approveTx.wait();
      }

      // Request conversion
      const tx = await conversionContract.requestConversion(amount);
      setStatus({ type: 'info', message: `Conversion request sent: ${tx.hash}. Waiting for confirmation...` });
      
      const receipt = await tx.wait();
      const requestId = receipt.logs[0].args[0];
      
      setStatus({ 
        type: 'success', 
        message: `Conversion request #${requestId} created! It will be processed within 14 days.` 
      });
      
      setVusdtAmount('');
      setTimeout(() => {
        loadBalances(vusdt, conversionContract);
        loadUserRequests(conversionContract);
      }, 2000);
    } catch (error) {
      console.error('Conversion request error:', error);
      const errorMessage = error.reason || error.message || 'Request failed';
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'var(--binance-warning)';
      case 'Processing': return 'var(--binance-info)';
      case 'Completed': return 'var(--binance-success)';
      case 'Cancelled': return 'var(--binance-error)';
      default: return 'var(--binance-text-secondary)';
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>Convert VUSDT to USDT</h2>
        <p>Please connect your wallet to request conversion</p>
      </div>
    );
  }

  if (!CONVERSION_CONTRACT_ADDRESS) {
    return (
      <div className="card">
        <h2>Convert VUSDT to USDT</h2>
        <div className="status status-info">
          <p>Conversion contract is not configured yet.</p>
        </div>
      </div>
    );
  }

  const availableBalance = parseFloat(vusdtBalance) - parseFloat(lockedBalance);

  return (
    <div className="card">
      <h2>{t('conversion.title')}</h2>
      <p style={{ color: 'var(--binance-text-secondary)', marginBottom: '20px' }}>
        {t('conversion.description')} 
        <strong style={{ color: 'var(--binance-warning)' }}> {t('conversion.noYieldWarning')}</strong>
      </p>

      <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--binance-dark-tertiary)', borderRadius: '4px', border: '1px solid var(--binance-border)' }}>
        <p style={{ marginBottom: '8px' }}>
          <strong>{t('conversion.vusdtBalance')}</strong> {parseFloat(vusdtBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} VUSDT
        </p>
        <p style={{ marginBottom: '8px' }}>
          <strong>{t('conversion.lockedInConversion')}</strong> {parseFloat(lockedBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} VUSDT
        </p>
        <p style={{ fontSize: '12px', color: 'var(--binance-text-secondary)' }}>
          <strong>{t('conversion.available')}</strong> {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} VUSDT
        </p>
      </div>

      {status && (
        <div className={`status status-${status.type}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleRequestConversion}>
        <label className="label">{t('conversion.amountLabel')}</label>
        <input
          type="number"
          className="input"
          placeholder="0.0"
          step="0.000001"
          min="0"
          max={availableBalance}
          value={vusdtAmount}
          onChange={(e) => setVusdtAmount(e.target.value)}
          disabled={loading}
        />
        <p style={{ fontSize: '12px', color: 'var(--binance-text-secondary)', marginBottom: '16px' }}>
          {t('conversion.youWillReceive', { amount: vusdtAmount || '0' })}
        </p>

        <button
          type="submit"
          className="button"
          disabled={loading || !vusdtAmount || parseFloat(vusdtAmount) <= 0 || parseFloat(vusdtAmount) > availableBalance}
          style={{ width: '100%' }}
        >
          {loading ? t('common.processing') : t('conversion.requestButton')}
        </button>
      </form>

      {userRequests.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{t('conversion.yourRequests')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {userRequests.map((request) => {
              const isPending = request.status === 'Pending' || request.status === 'Processing';
              const daysRemaining = isPending 
                ? Math.ceil((request.lockedUntil - new Date()) / (1000 * 60 * 60 * 24))
                : 0;
              
              return (
                <div 
                  key={request.id}
                  style={{
                    padding: '16px',
                    background: 'var(--binance-dark-tertiary)',
                    borderRadius: '8px',
                    border: '1px solid var(--binance-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <strong>Request #{request.id}</strong>
                      <span style={{ 
                        marginLeft: '12px', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        background: getStatusColor(request.status) + '20',
                        color: getStatusColor(request.status),
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {request.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--binance-text-secondary)' }}>
                      {request.amount} VUSDT
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--binance-text-secondary)' }}>
                    Requested: {request.requestedAt.toLocaleString()}
                  </div>
                  {isPending && (
                    <div style={{ fontSize: '12px', color: 'var(--binance-warning)', marginTop: '4px' }}>
                      {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Ready for processing'}
                    </div>
                  )}
                  {request.status === 'Completed' && (
                    <div style={{ fontSize: '12px', color: 'var(--binance-success)', marginTop: '4px' }}>
                      ✓ Conversion completed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversionRequest;

