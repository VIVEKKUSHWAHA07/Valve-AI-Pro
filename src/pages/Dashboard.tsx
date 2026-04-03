import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Settings, Beaker, Activity, CheckCircle2, AlertTriangle, XCircle, User, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function Dashboard() {
  const { user, accessPending, accessDenied } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalProcessed: 0,
    rowsAutoFilled: 0,
    flagsRaised: 0,
    notManufactured: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      
      try {
        setIsLoading(true);
        // Fetch recent activity
        const { data: history, error } = await supabase
          .from('processing_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching history:', error);
        } else if (history) {
          setRecentActivity(history);
          
          // Calculate stats from history (in a real app, this might be an aggregate query)
          let totalProcessed = 0;
          let flagsRaised = 0;
          let notManufactured = 0;
          
          history.forEach(job => {
            totalProcessed += job.total_rows || 0;
            flagsRaised += job.flags_count || 0;
            notManufactured += job.not_manufactured_count || 0;
          });
          
          setStatsData({
            totalProcessed,
            rowsAutoFilled: totalProcessed - flagsRaised - notManufactured,
            flagsRaised,
            notManufactured
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const stats = [
    { label: 'Total RFQs Processed', value: statsData.totalProcessed.toLocaleString(), icon: <FileSpreadsheet className="w-6 h-6 text-blue-500" />, trend: 'All time' },
    { label: 'Rows Auto-filled', value: statsData.rowsAutoFilled.toLocaleString(), icon: <CheckCircle2 className="w-6 h-6 text-green-500" />, trend: 'Successfully matched' },
    { label: 'Flags Raised', value: statsData.flagsRaised.toLocaleString(), icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />, trend: 'Requires review' },
    { label: 'Not-Manufactured', value: statsData.notManufactured.toLocaleString(), icon: <XCircle className="w-6 h-6 text-red-500" />, trend: 'Out of scope' },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 space-y-8 pb-20">
      {/* Access Restricted Banner */}
      {(accessPending || accessDenied) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Access Restricted
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                <p>
                  Your account is currently pending approval or lacks an active subscription. 
                  Some features may be limited until an administrator approves your access.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header & Profile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-[#E6EDF3]">
            ValveIQ <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A8FF] to-blue-400 dark:from-[#7EE787] dark:to-[#238636]">Pro</span> Dashboard
          </h1>
          <p className="text-slate-600 dark:text-[#8B949E] mt-1">Precision automation for valve engineering workflows</p>
        </div>
        
        <div className="bg-white dark:bg-[#161B22] p-4 rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-[#238636] flex items-center justify-center text-blue-600 dark:text-white font-bold text-lg">
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-[#E6EDF3]">{user?.user_metadata?.full_name || user?.email || 'Demo User'}</div>
            <div className="text-sm text-slate-500 dark:text-[#8B949E]">{user?.user_metadata?.company || 'EPC Engineering Corp'}</div>
            <div className="text-xs text-blue-500 dark:text-[#58A6FF] font-medium">Senior Valve Engineer</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/upload" className="flex items-center gap-3 bg-white dark:bg-[#161B22] p-4 rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm hover:border-blue-500 dark:hover:border-[#7EE787] dark:hover:shadow-[0_0_20px_rgba(126,231,135,0.08)] transition-all group">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-[rgba(126,231,135,0.1)] group-hover:bg-blue-100 dark:group-hover:bg-[rgba(126,231,135,0.2)] transition-colors">
            <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-[#7EE787]" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-[#E6EDF3]">Upload RFQ</div>
            <div className="text-sm text-slate-500 dark:text-[#8B949E]">Process new Excel file</div>
          </div>
        </Link>
        
        <Link to="/rules" className="flex items-center gap-3 bg-white dark:bg-[#161B22] p-4 rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm hover:border-purple-500 dark:hover:border-[#7EE787] dark:hover:shadow-[0_0_20px_rgba(126,231,135,0.08)] transition-all group">
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-[rgba(126,231,135,0.1)] group-hover:bg-purple-100 dark:group-hover:bg-[rgba(126,231,135,0.2)] transition-colors">
            <Settings className="w-6 h-6 text-purple-600 dark:text-[#7EE787]" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-[#E6EDF3]">View Rules</div>
            <div className="text-sm text-slate-500 dark:text-[#8B949E]">Manage engine logic</div>
          </div>
        </Link>
        
        <Link to="/test" className="flex items-center gap-3 bg-white dark:bg-[#161B22] p-4 rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm hover:border-green-500 dark:hover:border-[#7EE787] dark:hover:shadow-[0_0_20px_rgba(126,231,135,0.08)] transition-all group">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-[rgba(126,231,135,0.1)] group-hover:bg-green-100 dark:group-hover:bg-[rgba(126,231,135,0.2)] transition-colors">
            <Beaker className="w-6 h-6 text-green-600 dark:text-[#7EE787]" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-[#E6EDF3]">Run Test</div>
            <div className="text-sm text-slate-500 dark:text-[#8B949E]">Test engine accuracy</div>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="relative bg-white dark:bg-[#161B22] p-6 rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm hover:border-slate-300 dark:hover:border-[#7EE787] dark:hover:shadow-[0_0_20px_rgba(126,231,135,0.08)] transition-all">
            <div className="absolute top-0 left-0 w-4 h-4 hidden dark:block border-t-2 border-l-2 border-[#7EE787] opacity-40 rounded-tl-xl" />
            <div className="absolute bottom-0 right-0 w-4 h-4 hidden dark:block border-b-2 border-r-2 border-[#7EE787] opacity-40 rounded-br-xl" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-[rgba(126,231,135,0.1)]">
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl font-display font-bold text-slate-900 dark:text-[#7EE787] mb-1">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-[#7EE787]" /> : stat.value}
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-[#8B949E]">{stat.label}</div>
            <div className="text-xs text-slate-500 dark:text-[#484F58] mt-2">
              {statsData.totalProcessed === 0 ? 'No RFQs processed yet' : stat.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-[#21262D] flex items-center gap-3 bg-slate-50 dark:bg-[#0D1117]">
          <Activity className="w-5 h-5 text-slate-500 dark:text-[#8B949E]" />
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-[#E6EDF3]">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-[#0D1117] text-slate-600 dark:text-[#8B949E] font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200 dark:border-[#21262D]">Filename</th>
                <th className="px-6 py-4 border-b border-slate-200 dark:border-[#21262D]">Date</th>
                <th className="px-6 py-4 border-b border-slate-200 dark:border-[#21262D]">Rows</th>
                <th className="px-6 py-4 border-b border-slate-200 dark:border-[#21262D]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#21262D] text-slate-700 dark:text-[#E6EDF3]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-[#8B949E]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading activity...
                  </td>
                </tr>
              ) : recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-[#8B949E]">
                    No recent activity found. Upload an RFQ to get started.
                  </td>
                </tr>
              ) : (
                recentActivity.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-[rgba(126,231,135,0.04)] transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-[#E6EDF3] flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-500 dark:text-[#58A6FF]" />
                      {activity.filename}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-[#8B949E]">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{activity.total_rows}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.status === 'Completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-[#1B4721] dark:text-[#3FB950]' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-[#341A00] dark:text-[#F0883E]'
                      }`}>
                        {activity.status || 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
