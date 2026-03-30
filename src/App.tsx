/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { RulesEditor } from './pages/RulesEditor';
import { TestPanel } from './pages/TestPanel';
import { Profile } from './pages/Profile';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#050B14]">
        <div className="w-8 h-8 border-4 border-[#00A8FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen font-sans text-slate-900 dark:text-slate-200 selection:bg-[#00A8FF]/30 selection:text-slate-900 dark:selection:text-white transition-colors duration-300">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/rules" 
                element={
                  <ProtectedRoute>
                    <RulesEditor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/test" 
                element={
                  <ProtectedRoute>
                    <TestPanel />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}