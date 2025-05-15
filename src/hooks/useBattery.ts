import { useState, useEffect, useCallback } from 'react';

interface BatteryState {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface UseBatteryResult {
  isSupported: boolean;
  loading: boolean;
  error: Error | null;
  battery: BatteryState | null;
}

function useBattery(): UseBatteryResult {
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [battery, setBattery] = useState<BatteryState | null>(null);

  const handleChange = useCallback((battery: BatteryManager) => {
    setBattery({
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
      level: battery.level,
    });
  }, []);

  useEffect(() => {
    if (!('getBattery' in navigator)) {
      setIsSupported(false);
      setLoading(false);
      setError(new Error('Battery API not supported'));
      return;
    }

    setIsSupported(true);

    const getBatteryStatus = async () => {
      try {
        const battery = await (navigator as any).getBattery();

        // Initial battery state
        handleChange(battery);

        // Add event listeners
        battery.addEventListener('chargingchange', () => handleChange(battery));
        battery.addEventListener('chargingtimechange', () => handleChange(battery));
        battery.addEventListener('dischargingtimechange', () => handleChange(battery));
        battery.addEventListener('levelchange', () => handleChange(battery));

        setLoading(false);
        setError(null);

        return () => {
          // Remove event listeners
          battery.removeEventListener('chargingchange', () => handleChange(battery));
          battery.removeEventListener('chargingtimechange', () => handleChange(battery));
          battery.removeEventListener('dischargingtimechange', () => handleChange(battery));
          battery.removeEventListener('levelchange', () => handleChange(battery));
        };
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to get battery status'));
      }
    };

    getBatteryStatus();
  }, [handleChange]);

  return {
    isSupported,
    loading,
    error,
    battery,
  };
}

export default useBattery; 