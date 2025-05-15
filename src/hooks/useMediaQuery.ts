import { useState, useEffect } from 'react';

type MediaQueryObject = {
  [key: string]: string | number | boolean;
};

function useMediaQuery(query: string | MediaQueryObject): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = typeof query === 'string'
      ? query
      : Object.entries(query)
          .map(([feature, value]) => {
            // Convert camelCase to kebab-case
            const kebabFeature = feature.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

            if (typeof value === 'boolean') {
              return value ? kebabFeature : `not ${kebabFeature}`;
            }

            return `(${kebabFeature}: ${value})`;
          })
          .join(' and ');

    const mediaQueryList = window.matchMedia(mediaQuery);

    const updateMatches = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches);
    };

    // Set initial value
    updateMatches(mediaQueryList);

    // Listen for changes
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updateMatches);
      return () => mediaQueryList.removeEventListener('change', updateMatches);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(updateMatches);
      return () => mediaQueryList.removeListener(updateMatches);
    }
  }, [query]);

  return matches;
}

// Predefined breakpoints (in pixels)
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
};

// Helper functions for common media queries
export const up = (breakpoint: keyof typeof breakpoints) =>
  `(min-width: ${breakpoints[breakpoint]}px)`;

export const down = (breakpoint: keyof typeof breakpoints) =>
  `(max-width: ${breakpoints[breakpoint] - 0.05}px)`;

export const between = (start: keyof typeof breakpoints, end: keyof typeof breakpoints) =>
  `(min-width: ${breakpoints[start]}px) and (max-width: ${breakpoints[end] - 0.05}px)`;

export const only = (breakpoint: keyof typeof breakpoints) => {
  const keys = Object.keys(breakpoints) as Array<keyof typeof breakpoints>;
  const index = keys.indexOf(breakpoint);
  const nextBreakpoint = keys[index + 1];

  return nextBreakpoint
    ? between(breakpoint, nextBreakpoint)
    : up(breakpoint);
};

export default useMediaQuery; 