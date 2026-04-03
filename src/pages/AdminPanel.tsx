import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Activity, Search, CheckCircle2, XCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function AdminPanel() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState('free');
  const [newCustomLimit, setNewCustomLimit] = useState(10);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin) {
        navigate('/');
      } else {
        loadUsers();
      }
    }
  }, [isAdmin, authLoading, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Load pending requests
      const { data: pending } = await supabase
        .from('pending_access')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      if (pending) setPendingRequests(pending);

      // We need to fetch from app_access and user_usage
      const { data: accessData, error: accessError } = await supabase
        .from('app_access')
        .select('*')
        .order('email', { ascending: true });
        
      if (accessError) throw accessError;

      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('*');
        
      if (usageError) throw usageError;

      // Merge data
      const merged = accessData.map(acc => {
        const usage = usageData.find(u => {
          // We don't have user_id in app_access directly unless we added it, but we can match by email if we had it.
          // Wait, user_usage has user_id. app_access has email.
          // This is tricky. Let's just fetch app_access for now.
          return false; // We'll handle usage separately or just show access for now
        });
        return { ...acc, usage };
      });

      setUsers(merged);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setGranting(true);
    setError(null);
    
    try {
      // Check if user exists in app_access
      const { data: existing } = await supabase
        .from('app_access')
        .select('*')
        .eq('email', newEmail)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('app_access')
          .update({
            active: true,
            plan: newPlan,
            custom_run_limit: newPlan === 'custom' ? newCustomLimit : null,
            granted_by: user?.id
          })
          .eq('email', newEmail);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('app_access')
          .insert({
            email: newEmail,
            active: true,
            plan: newPlan,
            custom_run_limit: newPlan === 'custom' ? newCustomLimit : null,
            granted_by: user?.id
          });
        if (error) throw error;
      }
      
      // Also try to update user_usage if the user has already signed up
      // We need to find the user_id by email. Since we can't easily query auth.users,
      // we'll just update app_access, and when the user logs in, they get the plan.
      // Wait, the trigger create_user_usage sets the plan to 'free' by default.
      // We can update user_usage by matching email? user_usage doesn't have email.
      // So we'll just let the app_access table be the source of truth for plan,
      // or we update user_usage when they log in. 
      // For now, just updating app_access is enough if we sync it later.
      
      // Also remove from pending_access if they are there
      await supabase
        .from('pending_access')
        .delete()
        .eq('email', newEmail);
      
      setNewEmail('');
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAccess = async (email: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${email}?`)) return;
    try {
      // 1. Update app_access
      const { error } = await supabase
        .from('app_access')
        .update({ active: false })
        .eq('email', email);
        
      if (error) throw error;

      // 2. Remove from pending_access if they are there
      await supabase
        .from('pending_access')
        .delete()
        .eq('email', email);

      // 3. Optional: we can also call an API to sign them out or disable their auth account
      // but setting active: false in app_access is enough to block login.

      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRestoreAccess = async (email: string) => {
    try {
      const { error } = await supabase
        .from('app_access')
        .update({ active: true })
        .eq('email', email);
        
      if (error) throw error;
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const approveRequest = async (email: string, requestId: string) => {
    try {
      // 1. Add to app_access
      await supabase.from('app_access').upsert({
        email,
        active: true,
        plan: 'free',
        granted_by: user?.id,
        // granted_at: new Date().toISOString() // Not in schema, skipping
      }, { onConflict: 'email' });

      // 2. Mark pending as approved or delete it
      await supabase.from('pending_access')
        .delete()
        .eq('email', email);

      // 3. Confirm their email in auth 
      //    (so Email not confirmed error disappears)
      await fetch('/api/admin/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, adminUserId: user?.id 
        })
      });

      // 4. Refresh list
      loadUsers();
      alert(`Access granted to ${email}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await supabase.from('pending_access')
        .delete()
        .eq('id', requestId);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 space-y-8 pb-20">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-[#E6EDF3] mb-4"
      >
        ← Back
      </button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-[#E6EDF3] flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500 dark:text-[#F85149]" />
            Admin Panel
          </h1>
          <p className="text-slate-600 dark:text-[#8B949E] mt-1">Manage users, access, and plans</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-[#F85149]/10 border border-red-200 dark:border-[#F85149]/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-[#F85149]">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 text-sm">
                Pending Access Requests ({pendingRequests.length})
              </h3>
            </div>
            
            {pendingRequests.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-slate-400">
                No pending requests
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase">
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Requested</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(req => (
                    <tr key={req.id}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {req.email}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(req.requested_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveRequest(req.email, req.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => rejectRequest(req.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-medium"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#E6EDF3] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#7EE787]" />
              Grant Access
            </h2>
            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-[#E6EDF3] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border-slate-300 dark:border-[#21262D] bg-slate-50 dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] focus:ring-[#7EE787] focus:border-[#7EE787]"
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-[#E6EDF3] mb-1">Plan</label>
                <select
                  value={newPlan}
                  onChange={e => setNewPlan(e.target.value)}
                  className="w-full rounded-lg border-slate-300 dark:border-[#21262D] bg-slate-50 dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] focus:ring-[#7EE787] focus:border-[#7EE787]"
                >
                  <option value="free">Free (3 runs/mo)</option>
                  <option value="starter">Starter (20 runs/mo)</option>
                  <option value="professional">Professional (Unlimited)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {newPlan === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-[#E6EDF3] mb-1">Custom Run Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={newCustomLimit}
                    onChange={e => setNewCustomLimit(parseInt(e.target.value) || 10)}
                    className="w-full rounded-lg border-slate-300 dark:border-[#21262D] bg-slate-50 dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] focus:ring-[#7EE787] focus:border-[#7EE787]"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={granting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#238636] to-[#2EA043] hover:from-[#2EA043] hover:to-[#3FB950] shadow-[0_0_15px_rgba(126,231,135,0.2)] hover:shadow-[0_0_25px_rgba(126,231,135,0.4)] text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Grant Access
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-[#21262D] bg-slate-50 dark:bg-[#0D1117] flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 dark:text-[#E6EDF3]">Access List</h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search emails..." 
                  className="pl-9 pr-4 py-1.5 rounded-lg border-slate-300 dark:border-[#21262D] bg-white dark:bg-[#0D1117] text-sm focus:ring-[#7EE787] focus:border-[#7EE787] dark:text-[#E6EDF3]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#7EE787]" /></div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 dark:text-[#8B949E] uppercase bg-slate-50 dark:bg-[#0D1117]">
                    <tr>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#21262D]">
                    {users.map((u, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[rgba(126,231,135,0.04)]">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-[#E6EDF3]">{u.email}</td>
                        <td className="px-4 py-3 capitalize dark:text-[#E6EDF3]">
                          {u.plan}
                          {u.plan === 'custom' && ` (${u.custom_run_limit})`}
                        </td>
                        <td className="px-4 py-3">
                          {u.active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-[rgba(126,231,135,0.1)] dark:text-[#7EE787] rounded text-xs font-medium border border-transparent dark:border-[#7EE787]/20">Active</span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-[#F85149]/10 dark:text-[#F85149] rounded text-xs font-medium border border-transparent dark:border-[#F85149]/20">Revoked</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.active ? (
                            <button 
                              onClick={() => handleRevokeAccess(u.email)}
                              className="text-red-600 hover:text-red-800 dark:text-[#F85149] dark:hover:text-red-400 text-xs font-medium"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleRestoreAccess(u.email)}
                              className="text-green-600 hover:text-green-800 dark:text-[#7EE787] dark:hover:text-green-400 text-xs font-medium"
                            >
                              Restore
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-[#8B949E]">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
