import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  loading: boolean;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  timestamp: number | null;
  error: GeolocationPositionError | null;
}

interface UseGeolocationOptions extends PositionOptions {
  enabled?: boolean;
  onSuccess?: (position: GeolocationPosition) => void;
  onError?: (error: GeolocationPositionError) => void;
}

function useGeolocation(options: UseGeolocationOptions = {}): GeolocationState {
  const {
    enabled = true,
    enableHighAccuracy = false,
    maximumAge = 0,
    timeout = Infinity,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    loading: true,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude: null,
    longitude: null,
    speed: null,
    timestamp: null,
    error: null,
  });

  const handleSuccess = useCallback(
    (position: GeolocationPosition) => {
      const {
        coords: {
          accuracy,
          altitude,
          altitudeAccuracy,
          heading,
          latitude,
          longitude,
          speed,
        },
        timestamp,
      } = position;

      setState({
        loading: false,
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        latitude,
        longitude,
        speed,
        timestamp,
        error: null,
      });

      onSuccess?.(position);
    },
    [onSuccess]
  );

  const handleError = useCallback(
    (error: GeolocationPositionError) => {
      setState((prevState) => ({
        ...prevState,
        loading: false,
        error,
      }));

      onError?.(error);
    },
    [onError]
  );

  useEffect(() => {
    if (!enabled) {
      setState((prevState) => ({
        ...prevState,
        loading: false,
      }));
      return;
    }

    if (!navigator.geolocation) {
      setState((prevState) => ({
        ...prevState,
        loading: false,
        error: {
          code: 0,
          message: 'Geolocation is not supported',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        },
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        maximumAge,
        timeout,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, enableHighAccuracy, maximumAge, timeout, handleSuccess, handleError]);

  return state;
}

export default useGeolocation; 