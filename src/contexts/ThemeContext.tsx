import React, { createContext, useContext, useState } from 'react';

interface ThemeContextType {
  theme: 'light';
  isInitialized: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized] = useState(true);
  const theme = 'light';

  return (
    <ThemeContext.Provider value={{ theme, isInitialized }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};