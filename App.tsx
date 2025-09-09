import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import Header from './components/Header';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {user ? <Dashboard /> : <LoginScreen />}
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>This application is a demonstration of Gemini API integration.</p>
        <p>Powered by <a href="https://labs.google" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Labs</a> and Google AI</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;