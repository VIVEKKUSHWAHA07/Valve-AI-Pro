import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { accessPending, setAuthState, user } = useAuth();
  
  // We need a local state to clear the pending screen if user wants to go back to sign in
  const [localAccessPending, setLocalAccessPending] = useState(false);

  const isPending = accessPending || localAccessPending;

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting to dashboard...');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: undefined, // no redirect
          data: { email_confirmed: true } // skip confirmation
        }
      });

      if (error) throw error;

      // Immediately sign them out — they cannot enter app yet
      await supabase.auth.signOut();

      // Add them to a pending_access table so admin can see them
      // Use upsert to avoid duplicate key errors if they try to sign up again
      await supabase.from('pending_access').upsert({
        email: email.trim().toLowerCase(),
        requested_at: new Date().toISOString()
      }, { onConflict: 'email' });

      // Show pending screen
      setLocalAccessPending(true);

    } catch (err: any) {
      // If user already exists, still show pending screen
      if (err.message?.includes('already registered') || 
          err.message?.includes('already been registered')) {
        setLocalAccessPending(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Step 1 — Sign in
      const { data, error } = await supabase.auth
        .signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

      if (error) throw error;

      // Step 2 — Navigate immediately
      // The AuthContext will handle checking app_access and showing the pending screen if needed
      navigate('/dashboard');

    } catch (err: any) {
      if (err.message?.includes('Email not confirmed')) {
        setError(
          'Account not confirmed. Contact admin for access.'
        );
      } else if (err.message?.includes('Invalid login')) {
        setError('Incorrect email or password.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0F1117]" style={{ backgroundImage: 'linear-gradient(rgba(126,231,135,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(126,231,135,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        <div className="max-w-md w-full mx-auto p-8 bg-white dark:bg-[#161B22] rounded-2xl border border-slate-200 dark:border-[#21262D] shadow-lg text-center space-y-4 relative">
          <div className="absolute top-0 left-0 w-4 h-4 hidden dark:block border-t-2 border-l-2 border-[#7EE787] opacity-40 rounded-tl-2xl" />
          <div className="absolute bottom-0 right-0 w-4 h-4 hidden dark:block border-b-2 border-r-2 border-[#7EE787] opacity-40 rounded-br-2xl" />
          <div className="w-16 h-16 bg-yellow-100 dark:bg-[#341A00] rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#E6EDF3]">Access Pending</h2>
          <p className="text-slate-600 dark:text-[#8B949E] text-sm">
            Your account has been registered. Please wait for the administrator to approve your access.
            You will be notified once access is granted.
          </p>
          <p className="text-xs text-slate-400 dark:text-[#484F58]">Registered email: {email}</p>
          <button
            onClick={() => {
              setLocalAccessPending(false);
              // We can't easily clear the context's accessPending here without adding a method to context,
              // but reloading or just letting the user sign in again works.
              window.location.reload();
            }}
            className="text-sm text-purple-600 dark:text-[#58A6FF] hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00A8FF]/5 dark:bg-[#7EE787]/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white dark:bg-[#161B22]/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-200 dark:border-[#21262D] shadow-2xl relative z-10">
        <div className="absolute top-0 left-0 w-4 h-4 hidden dark:block border-t-2 border-l-2 border-[#7EE787] opacity-40 rounded-tl-2xl" />
        <div className="absolute bottom-0 right-0 w-4 h-4 hidden dark:block border-b-2 border-r-2 border-[#7EE787] opacity-40 rounded-br-2xl" />
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-[#00A8FF] dark:bg-[#7EE787] blur-lg opacity-40 rounded-full"></div>
            <Settings className="w-12 h-12 text-[#00A8FF] dark:text-[#7EE787] relative z-10 dark:drop-shadow-[0_0_8px_#7EE787]" />
          </div>
        </div>
        
        <h2 className="text-2xl font-display font-bold text-center text-slate-900 dark:text-[#E6EDF3] mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-center text-slate-500 dark:text-[#8B949E] mb-8 text-sm">
          {isLogin ? 'Sign in to access your dashboard' : 'Sign up to start automating your workflows'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-[#3D0000] border border-red-200 dark:border-[#F85149] rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-[#F85149] shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-[#F85149]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-[#E6EDF3] mb-1.5">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 dark:text-[#8B949E]" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] rounded-lg text-slate-900 dark:text-[#E6EDF3] placeholder-slate-400 dark:placeholder-[#484F58] focus:ring-2 focus:ring-[#00A8FF] dark:focus:ring-[#7EE787] focus:border-transparent transition-all"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-[#E6EDF3] mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 dark:text-[#8B949E]" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] rounded-lg text-slate-900 dark:text-[#E6EDF3] placeholder-slate-400 dark:placeholder-[#484F58] focus:ring-2 focus:ring-[#00A8FF] dark:focus:ring-[#7EE787] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#00A8FF] to-[#008DE6] hover:from-[#008DE6] hover:to-[#0070B8] dark:from-[#238636] dark:to-[#2EA043] dark:hover:from-[#2EA043] dark:hover:to-[#3FB950] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A8FF] dark:focus:ring-[#7EE787] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 dark:shadow-[0_0_15px_rgba(126,231,135,0.2)] dark:hover:shadow-[0_0_25px_rgba(126,231,135,0.4)]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-[#00A8FF] dark:text-[#58A6FF] hover:text-[#008DE6] dark:hover:text-[#79C0FF] font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
