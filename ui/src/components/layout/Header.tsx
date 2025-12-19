import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Database, Upload, BarChart3 } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Quick Search', icon: Search },
    { path: '/search', label: 'Advanced Search', icon: BarChart3 },
    { path: '/contexts', label: 'Contexts', icon: Database },
    { path: '/upload', label: 'Upload', icon: Upload },
  ];

  return (
    <header className="bg-ink text-paper h-16 flex items-center px-6 shrink-0 z-50 shadow-md">
      <div className="flex items-center gap-3 mr-12">
        <div className="bg-ceremony p-1.5 rounded">
          <Database className="w-5 h-5 text-paper" />
        </div>
        <h1 className="text-xl font-bold tracking-tight uppercase">Ceremony Catalog</h1>
      </div>
      <nav className="flex items-center gap-1 h-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                           (item.path === '/search' && location.pathname === '/search');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 h-full transition-colors relative ${
                isActive ? 'text-paper' : 'text-slate-400 hover:text-paper'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-ceremony" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto">
         {/* Placeholder for user/settings if needed */}
      </div>
    </header>
  );
};

export default Header;
