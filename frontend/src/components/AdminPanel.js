import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';

const AdminPanel = () => {
  const { t } = useTranslation();
  const { account, vusdtContract, yieldDistributorContract, isConnected, signer } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [distributorInfo, setDistributorInfo] = useState(null);
  const [newYieldRate, setNewYieldRate] = useState('');
  const [showYieldRateForm, setShowYieldRateForm] = useState(false);
  const [conversionRequests, setConversionRequests] = useState([]);
  const [conversionContract, setConversionContract] = useState(null);

  const CONVERSION_CONTRACT_ADDRESS = process.env.REACT_APP_CONVERSION_CONTRACT_ADDRESS || '';
  
  const CONVERSION_ABI = [
    "function getPendingRequests(uint256 offset, uint256 limit) view returns (uint256[] requestIds, tuple(address requester, uint256 vusdtAmount, uint256 requestedAt, uint256 lockedUntil, uint8 status, bool exists)[] requests)",
    "function getRequest(uint256 requestId) view returns (tuple(address requester, uint256 vusdtAmount, uint256 requestedAt, uint256 lockedUntil, uint8 status, bool exists))",
    "function markAsProcessing(uint256 requestId) external",
    "function completeConversion(uint256 requestId) external",
    "function cancelRequest(uint256 requestId) external",
    "function totalRequests() view returns (uint256)"
  ];

  useEffect(() => {
    if (isConnected && yieldDistributorContract) {
      loadDistributorInfo();
      
      // Use polling instead of event listeners to avoid RPC limit errors
      const interval = setInterval(() => {
        loadDistributorInfo();
      }, 20000); // Poll every 20 seconds

      return () => {
        clearInterval(interval);
      };
    }
  }, [isConnected, yieldDistributorContract]);

  useEffect(() => {
    if (isConnected && signer && CONVERSION_CONTRACT_ADDRESS) {
      const conversion = new ethers.Contract(CONVERSION_CONTRACT_ADDRESS, CONVERSION_ABI, signer);
      setConversionContract(conversion);
      loadConversionRequests(conversion);
      
      const interval = setInterval(() => {
        loadConversionRequests(conversion);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, signer, CONVERSION_CONTRACT_ADDRESS]);

  const loadDistributorInfo = async () => {
    if (!yieldDistributorContract) return;
    try {
      const [yieldRate, lastDist, paused, canDist, holderCount] = await Promise.all([
        yieldDistributorContract.weeklyYieldRateBps(),
        yieldDistributorContract.lastDistributionTime(),
        yieldDistributorContract.distributionPaused(),
        yieldDistributorContract.canDistribute(),
        yieldDistributorContract.getHolderCount().catch(() => 0),
      ]);

      setDistributorInfo({
        yieldRate: Number(yieldRate) / 100,
        yieldRateBps: Number(yieldRate),
        lastDistribution: new Date(Number(lastDist) * 1000).toLocaleString(),
        paused,
        canDistribute: canDist,
        holderCount: Number(holderCount),
      });
    } catch (error) {
      // Silently handle RPC errors to avoid console spam
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error loading distributor info:', error);
      }
    }
  };

  const handleDistributeYield = async () => {
    if (!yieldDistributorContract) return;
    setLoading(true);
    setStatus(null);

    try {
      const tx = await yieldDistributorContract.distributeYield();
      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` });
      const receipt = await tx.wait();
      setStatus({ 
        type: 'success', 
        message: `Yield distributed! Block: ${receipt.blockNumber}` 
      });
      loadDistributorInfo();
    } catch (error) {
      console.error('Distribution error:', error);
      setStatus({ 
        type: 'error', 
        message: error.reason || error.message || 'Distribution failed' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!yieldDistributorContract) return;
    setLoading(true);
    try {
      const tx = await yieldDistributorContract.pauseDistribution();
      await tx.wait();
      setStatus({ type: 'success', message: 'Distribution paused' });
      loadDistributorInfo();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!yieldDistributorContract) return;
    setLoading(true);
    try {
      const tx = await yieldDistributorContract.resumeDistribution();
      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` });
      await tx.wait();
      setStatus({ type: 'success', message: 'Distribution resumed successfully' });
      loadDistributorInfo();
    } catch (error) {
      setStatus({ type: 'error', message: error.reason || error.message || 'Failed to resume distribution' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetYieldRate = async () => {
    if (!yieldDistributorContract || !newYieldRate) return;
    
    const rate = parseFloat(newYieldRate);
    if (isNaN(rate) || rate < 0 || rate > 10) {
      setStatus({ type: 'error', message: 'Rate must be between 0 and 10%' });
      return;
    }

    setLoading(true);
    setStatus(null);
    
    try {
      // Convert percentage to basis points (multiply by 100)
      const rateBps = Math.round(rate * 100);
      const tx = await yieldDistributorContract.setWeeklyYieldRate(rateBps);
      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` });
      const receipt = await tx.wait();
      setStatus({ type: 'success', message: `Yield rate updated to ${rate}%! Block: ${receipt.blockNumber}` });
      setNewYieldRate('');
      setShowYieldRateForm(false);
      loadDistributorInfo();
    } catch (error) {
      setStatus({ type: 'error', message: error.reason || error.message || 'Failed to update yield rate' });
    } finally {
      setLoading(false);
    }
  };

  const loadConversionRequests = async (conversion) => {
    if (!conversion) return;
    try {
      const [requestIds, requests] = await conversion.getPendingRequests(0, 100);
      const formattedRequests = requests.map((req, idx) => ({
        id: Number(requestIds[idx]),
        requester: req.requester,
        amount: ethers.formatEther(req.vusdtAmount),
        requestedAt: new Date(Number(req.requestedAt) * 1000),
        lockedUntil: new Date(Number(req.lockedUntil) * 1000),
        status: ['Pending', 'Processing', 'Completed', 'Cancelled'][req.status],
        canComplete: Number(req.lockedUntil) * 1000 <= Date.now()
      }));
      setConversionRequests(formattedRequests);
    } catch (error) {
      if (error.code !== -32603 && error.code !== -32005) {
        console.error('Error loading conversion requests:', error);
      }
    }
  };

  const handleMarkAsProcessing = async (requestId) => {
    if (!conversionContract) return;
    setLoading(true);
    try {
      const tx = await conversionContract.markAsProcessing(requestId);
      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` });
      await tx.wait();
      setStatus({ type: 'success', message: `Request #${requestId} marked as processing` });
      loadConversionRequests(conversionContract);
    } catch (error) {
      setStatus({ type: 'error', message: error.reason || error.message || 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteConversion = async (requestId) => {
    if (!conversionContract) return;
    if (!window.confirm(`Complete conversion for request #${requestId}? Make sure you have manually transferred USDT to the requester.`)) {
      return;
    }
    setLoading(true);
    try {
      const tx = await conversionContract.completeConversion(requestId);
      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` });
      await tx.wait();
      setStatus({ type: 'success', message: `Request #${requestId} completed` });
      loadConversionRequests(conversionContract);
    } catch (error) {
      setStatus({ type: 'error', message: error.reason || error.message || 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!conversionContract) return;
    if (!window.confirm(`Cancel request #${requestId}? Tokens will be returned to the requester.`)) {
      return;
    }
    setLoading(true);
    try {
      const tx = await conversionContract.cancelRequest(requestId);
      setStatus({ type: 'info', message: `Transaction sent: ${tx.hash}` });
      await tx.wait();
      setStatus({ type: 'success', message: `Request #${requestId} cancelled` });
      loadConversionRequests(conversionContract);
    } catch (error) {
      setStatus({ type: 'error', message: error.reason || error.message || 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="card">
      <h2>{t('admin.title')}</h2>
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--binance-success)', 
        marginBottom: '16px', 
        padding: '12px', 
        background: 'rgba(14, 203, 129, 0.1)', 
        borderRadius: '4px',
        border: '1px solid var(--binance-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ 
          width: '8px', 
          height: '8px', 
          background: 'var(--binance-success)', 
          borderRadius: '50%',
          display: 'inline-block'
        }}></span>
        <span><strong>Connected as owner:</strong> {account}</span>
      </div>
      
      {distributorInfo && (
        <div style={{ 
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          <div className="stats-card">
            <div className="stats-value" style={{ color: 'var(--binance-yellow)' }}>
              {distributorInfo.yieldRate}%
            </div>
            <div className="stats-label">{t('admin.weeklyYieldRate')}</div>
          </div>
          <div className="stats-card">
            <div className="stats-value" style={{ 
              color: distributorInfo.paused ? 'var(--binance-error)' : 'var(--binance-success)',
              fontSize: '20px'
            }}>
              {distributorInfo.paused ? '⏸' : '▶'}
            </div>
            <div className="stats-label">{distributorInfo.paused ? t('admin.statusPaused') : t('admin.statusActive')}</div>
          </div>
          <div className="stats-card">
            <div className="stats-value" style={{ 
              color: distributorInfo.canDistribute ? 'var(--binance-success)' : 'var(--binance-text-tertiary)',
              fontSize: '20px'
            }}>
              {distributorInfo.canDistribute ? '✓' : '✗'}
            </div>
            <div className="stats-label">Can Distribute</div>
          </div>
          <div className="stats-card">
            <div className="stats-value" style={{ color: 'var(--binance-info)' }}>
              {distributorInfo.holderCount}
            </div>
            <div className="stats-label">Registered Holders</div>
          </div>
        </div>
      )}
      {distributorInfo && (
        <div style={{ 
          padding: '12px',
          background: 'var(--binance-dark-tertiary)',
          borderRadius: '4px',
          border: '1px solid var(--binance-border)',
          marginBottom: '16px',
          fontSize: '13px',
          color: 'var(--binance-text-secondary)'
        }}>
          <strong style={{ color: 'var(--binance-text-primary)' }}>Last Distribution:</strong> {distributorInfo.lastDistribution}
        </div>
      )}

      {status && (
        <div className={`status status-${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Yield Rate Settings */}
      <div style={{ 
        marginBottom: '20px',
        padding: '16px',
        background: 'var(--binance-dark-tertiary)',
        borderRadius: '4px',
        border: '1px solid var(--binance-border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--binance-text-primary)' }}>
            {t('admin.yieldRateSettings')}
          </h3>
          <button
            className="button button-secondary"
            onClick={() => {
              setShowYieldRateForm(!showYieldRateForm);
              setNewYieldRate('');
            }}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            {showYieldRateForm ? 'Cancel' : 'Change Rate'}
          </button>
        </div>
        
        {showYieldRateForm && (
          <div>
            <label className="label">{t('admin.newRateLabel')}</label>
            <input
              type="number"
              className="input"
              placeholder={`Current: ${distributorInfo?.yieldRate || 0}%`}
              step="0.01"
              min="0"
              max="10"
              value={newYieldRate}
              onChange={(e) => setNewYieldRate(e.target.value)}
              disabled={loading}
            />
            <p style={{ fontSize: '12px', color: 'var(--binance-text-tertiary)', marginBottom: '12px' }}>
              Range: 0% - 10% (e.g., 0.22 for 0.22% weekly = ~12% APY)
            </p>
            <button
              className="button"
              onClick={handleSetYieldRate}
              disabled={loading || !newYieldRate}
              style={{ width: '100%' }}
            >
              {loading ? 'Updating...' : 'Update Yield Rate'}
            </button>
          </div>
        )}
      </div>

      {/* Distribution Controls */}
      <div style={{ 
        marginBottom: '20px',
        padding: '16px',
        background: 'var(--binance-dark-tertiary)',
        borderRadius: '4px',
        border: '1px solid var(--binance-border)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--binance-text-primary)' }}>
          Distribution Controls
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="button" 
            onClick={handleDistributeYield}
            disabled={loading || !distributorInfo?.canDistribute}
            style={{ flex: '1', minWidth: '200px' }}
          >
            {loading ? 'Processing...' : 'Distribute Yield'}
          </button>
          
          {distributorInfo?.paused ? (
            <button 
              className="button" 
              onClick={handleResume}
              disabled={loading}
              style={{ flex: '1', minWidth: '200px' }}
            >
              Resume Distribution
            </button>
          ) : (
            <button 
              className="button button-danger" 
              onClick={handlePause}
              disabled={loading}
              style={{ flex: '1', minWidth: '200px' }}
            >
              Pause Distribution
            </button>
          )}
        </div>
      </div>

      {/* Conversion Requests Management */}
      {CONVERSION_CONTRACT_ADDRESS && (
        <div style={{ 
          marginTop: '20px',
          padding: '16px',
          background: 'var(--binance-dark-tertiary)',
          borderRadius: '4px',
          border: '1px solid var(--binance-border)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--binance-text-primary)' }}>
            Conversion Requests Management
          </h3>
          
          {conversionRequests.length === 0 ? (
            <p style={{ color: 'var(--binance-text-secondary)', fontSize: '14px' }}>
              No pending conversion requests
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {conversionRequests.map((request) => {
                const daysRemaining = Math.ceil((request.lockedUntil - new Date()) / (1000 * 60 * 60 * 24));
                const isReady = request.canComplete;
                
                return (
                  <div 
                    key={request.id}
                    style={{
                      padding: '16px',
                      background: 'var(--binance-dark-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--binance-border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <strong>Request #{request.id}</strong>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            background: request.status === 'Pending' ? 'rgba(240, 185, 11, 0.2)' : 'rgba(52, 152, 219, 0.2)',
                            color: request.status === 'Pending' ? 'var(--binance-warning)' : 'var(--binance-info)',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {request.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--binance-text-secondary)', marginBottom: '4px' }}>
                          <strong>Requester:</strong> {request.requester.slice(0, 6)}...{request.requester.slice(-4)}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--binance-text-secondary)', marginBottom: '4px' }}>
                          <strong>Amount:</strong> {parseFloat(request.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} VUSDT
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--binance-text-tertiary)' }}>
                          Requested: {request.requestedAt.toLocaleString()}
                        </div>
                        {!isReady && (
                          <div style={{ fontSize: '12px', color: 'var(--binance-warning)', marginTop: '4px' }}>
                            ⏳ {daysRemaining} days remaining
                          </div>
                        )}
                        {isReady && (
                          <div style={{ fontSize: '12px', color: 'var(--binance-success)', marginTop: '4px' }}>
                            ✓ Ready for processing
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {request.status === 'Pending' && (
                        <button
                          className="button button-secondary"
                          onClick={() => handleMarkAsProcessing(request.id)}
                          disabled={loading}
                          style={{ fontSize: '12px', padding: '8px 16px' }}
                        >
                          Mark as Processing
                        </button>
                      )}
                      {isReady && request.status !== 'Completed' && (
                        <button
                          className="button"
                          onClick={() => handleCompleteConversion(request.id)}
                          disabled={loading}
                          style={{ fontSize: '12px', padding: '8px 16px' }}
                        >
                          Complete Conversion
                        </button>
                      )}
                      {request.status !== 'Completed' && (
                        <button
                          className="button button-danger"
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={loading}
                          style={{ fontSize: '12px', padding: '8px 16px' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

