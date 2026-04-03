import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Sun, Moon, LogIn, Shield, Menu, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isCurrent = (path: string) => location.pathname === path;
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-[#21262D] bg-white/80 dark:bg-[#111318]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group" onClick={closeMenu}>
              <div className="relative">
                <div className="absolute inset-0 bg-[#00A8FF] dark:bg-[#7EE787] blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                <Settings className="w-8 h-8 text-[#00A8FF] dark:text-[#7EE787] relative z-10 dark:drop-shadow-[0_0_8px_#7EE787]" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-[#E6EDF3] dark:drop-shadow-[0_0_8px_rgba(126,231,135,0.5)]">
                VALVE AI <span className="text-[#00A8FF] dark:text-[#7EE787]">PRO</span>
              </span>
            </Link>
            
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                <Link 
                  to="/dashboard" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/dashboard') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] dark:border-l-2 dark:border-[#7EE787]' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/upload" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/upload') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] dark:border-l-2 dark:border-[#7EE787]' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
                  }`}
                >
                  Upload RFQ
                </Link>
                <Link 
                  to="/catalogue" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/catalogue') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] dark:border-l-2 dark:border-[#7EE787]' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
                  }`}
                >
                  Catalogue
                </Link>
                <Link 
                  to="/rules" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/rules') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] dark:border-l-2 dark:border-[#7EE787]' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
                  }`}
                >
                  Rules
                </Link>
                <Link 
                  to="/test" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/test') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] dark:border-l-2 dark:border-[#7EE787]' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
                  }`}
                >
                  Test
                </Link>
                <Link 
                  to="/profile" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent('/profile') 
                      ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] dark:border-l-2 dark:border-[#7EE787]' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
                  }`}
                >
                  Profile
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isCurrent('/admin') 
                        ? 'bg-red-500/10 text-red-500 dark:bg-[#3D0000] dark:text-[#F85149] dark:border-l-2 dark:border-[#F85149]' 
                        : 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-[#F85149] dark:hover:text-red-300 dark:hover:bg-[#3D0000]'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:bg-[#161B22] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block text-sm text-slate-600 dark:text-[#8B949E]">
                  {user.email}
                </div>
                <button 
                  onClick={signOut}
                  className="px-3 py-2 sm:px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-[#8B949E] dark:bg-transparent dark:hover:text-[#F85149] rounded-lg transition-colors"
                >
                  Sign Out
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:bg-[#161B22] transition-colors"
                  aria-label="Toggle mobile menu"
                >
                  {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            ) : (
              <Link 
                to="/auth"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00A8FF] to-[#008DE6] hover:from-[#008DE6] hover:to-[#0070B8] dark:from-[#238636] dark:to-[#2EA043] dark:hover:from-[#2EA043] dark:hover:to-[#3FB950] text-white text-sm font-medium rounded-lg shadow-[0_0_15px_rgba(0,168,255,0.3)] hover:shadow-[0_0_25px_rgba(0,168,255,0.5)] dark:shadow-[0_0_15px_rgba(126,231,135,0.3)] dark:hover:shadow-[0_0_25px_rgba(126,231,135,0.5)] transition-all duration-300"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {user && isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-[#21262D] bg-white dark:bg-[#111318]">
          <div className="px-4 pt-2 pb-4 space-y-1">
            <Link 
              to="/dashboard" 
              onClick={closeMenu}
              className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                isCurrent('/dashboard') 
                  ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] border-l-4 border-[#00A8FF] dark:border-[#7EE787]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              to="/upload" 
              onClick={closeMenu}
              className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                isCurrent('/upload') 
                  ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] border-l-4 border-[#00A8FF] dark:border-[#7EE787]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
              }`}
            >
              Upload RFQ
            </Link>
            <Link 
              to="/catalogue" 
              onClick={closeMenu}
              className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                isCurrent('/catalogue') 
                  ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] border-l-4 border-[#00A8FF] dark:border-[#7EE787]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
              }`}
            >
              Catalogue
            </Link>
            <Link 
              to="/rules" 
              onClick={closeMenu}
              className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                isCurrent('/rules') 
                  ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] border-l-4 border-[#00A8FF] dark:border-[#7EE787]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
              }`}
            >
              Rules
            </Link>
            <Link 
              to="/test" 
              onClick={closeMenu}
              className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                isCurrent('/test') 
                  ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] border-l-4 border-[#00A8FF] dark:border-[#7EE787]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
              }`}
            >
              Test
            </Link>
            <Link 
              to="/profile" 
              onClick={closeMenu}
              className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                isCurrent('/profile') 
                  ? 'bg-[#00A8FF]/10 text-[#00A8FF] dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] border-l-4 border-[#00A8FF] dark:border-[#7EE787]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8B949E] dark:hover:text-[#E6EDF3] dark:hover:bg-[#161B22]'
              }`}
            >
              Profile
            </Link>
            {isAdmin && (
              <Link 
                to="/admin" 
                onClick={closeMenu}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  isCurrent('/admin') 
                    ? 'bg-red-500/10 text-red-500 dark:bg-[#3D0000] dark:text-[#F85149] border-l-4 border-red-500 dark:border-[#F85149]' 
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-[#F85149] dark:hover:text-red-300 dark:hover:bg-[#3D0000]'
                }`}
              >
                <Shield className="w-5 h-5" />
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
