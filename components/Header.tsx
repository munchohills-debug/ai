
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
           <h1 className="text-2xl font-bold text-gray-800">Flow Credit Adder</h1>
        </div>
        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, <span className="font-semibold">{user.username}</span></span>
            <Button onClick={logout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
