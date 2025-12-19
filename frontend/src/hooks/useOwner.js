import { useState, useEffect } from 'react';
import { useWeb3 } from './useWeb3';

export const useOwner = () => {
  const { account, vusdtContract, isConnected } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isConnected && vusdtContract && account) {
      checkOwnership();
    } else {
      setIsOwner(false);
      setOwnerAddress(null);
    }
  }, [isConnected, vusdtContract, account]);

  const checkOwnership = async () => {
    if (!vusdtContract || !account) {
      setIsOwner(false);
      return;
    }
    
    setChecking(true);
    try {
      const owner = await vusdtContract.owner();
      setOwnerAddress(owner);
      const isOwnerCheck = owner.toLowerCase() === account.toLowerCase();
      setIsOwner(isOwnerCheck);
    } catch (error) {
      console.error('Error checking ownership:', error);
      setIsOwner(false);
    } finally {
      setChecking(false);
    }
  };

  return {
    isOwner,
    ownerAddress,
    checking,
    checkOwnership,
  };
};

