import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden bg-paper">
        {children}
      </main>
    </div>
  );
};

export default Layout;
