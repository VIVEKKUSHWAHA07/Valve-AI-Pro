import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Sun, Moon, LogIn, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#0A1120]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00A8FF] blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                <Settings className="w-8 h-8 text-[#00A8FF] relative z-10" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
                VALVE AI <span className="text-[#00A8FF]">PRO</span>
              </span>
            </Link>
            
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                <Link 
                  to="/dashboard" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/dashboard') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[#00A8FF]/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/upload" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/upload') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[#00A8FF]/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50'
                  }`}
                >
                  Upload RFQ
                </Link>
                <Link 
                  to="/rules" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/rules') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[#00A8FF]/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50'
                  }`}
                >
                  Rules
                </Link>
                <Link 
                  to="/test" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/test') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[#00A8FF]/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50'
                  }`}
                >
                  Test
                </Link>
                <Link 
                  to="/profile" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/profile') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[#00A8FF]/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50'
                  }`}
                >
                  Profile
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-sm text-slate-600 dark:text-slate-400">
                  {user.email}
                </div>
                <button 
                  onClick={signOut}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link 
                to="/auth"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00A8FF] to-[#008DE6] hover:from-[#008DE6] hover:to-[#0070B8] text-white text-sm font-medium rounded-lg shadow-[0_0_15px_rgba(0,168,255,0.3)] hover:shadow-[0_0_25px_rgba(0,168,255,0.5)] transition-all duration-300"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
