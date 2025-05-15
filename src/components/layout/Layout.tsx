import React from 'react';
import Header from './Header';

type LayoutProps = {
  children: React.ReactNode;
  title: string;
  onMenuClick?: () => void;
};

const Layout = ({ children, title, onMenuClick }: LayoutProps) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <Header title={title} onMenuClick={onMenuClick || (() => {})} />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {children}
      </main>
    </div>
  );
};


export default Layout;