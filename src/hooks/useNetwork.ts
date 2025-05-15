import { useState, useEffect, useCallback } from 'react';

interface NetworkState {
  online: boolean;
  since?: Date;
  rtt?: number;
  type?: string;
  downlink?: number;
  saveData?: boolean;
  downlinkMax?: number;
  effectiveType?: string;
}

interface UseNetworkResult extends NetworkState {
  isSupported: boolean;
}

function useNetwork(): UseNetworkResult {
  const [isSupported, setIsSupported] = useState(false);
  const [networkState, setNetworkState] = useState<NetworkState>({
    online: true,
  });

  const getNetworkConnection = useCallback((): NetworkState => {
    if (!navigator.onLine) {
      return { online: false };
    }

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      return {
        online: true,
        rtt: connection.rtt,
        type: connection.type,
        downlink: connection.downlink,
        saveData: connection.saveData,
        downlinkMax: connection.downlinkMax,
        effectiveType: connection.effectiveType,
      };
    }

    return { online: true };
  }, []);

  const updateNetworkStatus = useCallback(() => {
    const state = getNetworkConnection();
    state.since = new Date();
    setNetworkState(state);
  }, [getNetworkConnection]);

  useEffect(() => {
    setIsSupported('connection' in navigator);

    // Update network status initially
    updateNetworkStatus();

    // Add event listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);

      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return {
    isSupported,
    ...networkState,
  };
}

export default useNetwork; 