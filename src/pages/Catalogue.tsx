import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Catalogue() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [version, setVersion] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadCatalogue();
    }
  }, [user]);

  const loadCatalogue = async () => {
    setFetching(true);
    try {
      // Get latest version
      const { data: vData, error: vError } = await supabase
        .from('catalogue_versions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (vError && vError.code !== 'PGRST116') throw vError;
      
      if (vData) {
        setVersion(vData);
        // Get products
        const { data: pData, error: pError } = await supabase
          .from('product_catalogue')
          .select('*')
          .eq('user_id', user?.id)
          .order('part_number', { ascending: true })
          .limit(100); // Just show top 100 for preview
          
        if (pError) throw pError;
        setProducts(pData || []);
      } else {
        setVersion(null);
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Failed to load catalogue:', err);
      setError('Failed to load catalogue data.');
    } finally {
      setFetching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user?.id || '');

    try {
      const response = await fetch('/api/catalogue/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setSuccess(`Successfully uploaded catalogue with ${result.count} products.`);
      loadCatalogue();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleClearCatalogue = async () => {
    if (!confirm('Are you sure you want to delete your entire product catalogue? This cannot be undone.')) return;
    
    setLoading(true);
    try {
      const { error: pError } = await supabase
        .from('product_catalogue')
        .delete()
        .eq('user_id', user?.id);
        
      if (pError) throw pError;

      const { error: vError } = await supabase
        .from('catalogue_versions')
        .delete()
        .eq('user_id', user?.id);
        
      if (vError) throw vError;

      setSuccess('Catalogue cleared successfully.');
      setProducts([]);
      setVersion(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-[#E6EDF3] flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-[#00A8FF] dark:text-[#7EE787]" />
          Product Catalogue
        </h1>
        <p className="text-slate-600 dark:text-[#8B949E] mt-1">Manage your custom product database for RFQ matching.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-[#F85149]/10 border border-red-200 dark:border-[#F85149]/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-[#F85149]">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-[rgba(126,231,135,0.1)] border border-green-200 dark:border-[#7EE787]/30 rounded-xl flex items-start gap-3 text-green-700 dark:text-[#7EE787]">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#E6EDF3] mb-4">Upload Catalogue</h2>
            <p className="text-sm text-slate-600 dark:text-[#8B949E] mb-6">
              Upload an Excel file containing your product catalogue. This will replace your current catalogue.
            </p>
            
            <div className="space-y-4">
              <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-[#21262D] rounded-xl hover:bg-slate-50 dark:hover:bg-[rgba(126,231,135,0.02)] hover:border-[#00A8FF] dark:hover:border-[#7EE787] transition-colors cursor-pointer group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {loading ? (
                    <Loader2 className="w-8 h-8 text-[#00A8FF] dark:text-[#7EE787] animate-spin mb-2" />
                  ) : (
                    <UploadIcon className="w-8 h-8 text-slate-400 group-hover:text-[#00A8FF] dark:group-hover:text-[#7EE787] mb-2 transition-colors" />
                  )}
                  <p className="text-sm text-slate-600 dark:text-[#8B949E] font-medium">
                    {loading ? 'Uploading...' : 'Click to upload Excel file'}
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#21262D] hover:bg-slate-200 dark:hover:bg-[#30363D] text-slate-700 dark:text-[#E6EDF3] rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>

          {version && (
            <div className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#E6EDF3] mb-4">Current Version</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#8B949E]">Uploaded:</span>
                  <span className="font-medium text-slate-900 dark:text-[#E6EDF3]">
                    {new Date(version.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#8B949E]">Products:</span>
                  <span className="font-medium text-slate-900 dark:text-[#E6EDF3]">{version.row_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#8B949E]">Filename:</span>
                  <span className="font-medium text-slate-900 dark:text-[#E6EDF3] truncate max-w-[150px]" title={version.filename}>
                    {version.filename}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-[#21262D]">
                <button 
                  onClick={handleClearCatalogue}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 dark:text-[#F85149] hover:bg-red-50 dark:hover:bg-[#F85149]/10 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Catalogue
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-4 border-b border-slate-200 dark:border-[#21262D] bg-slate-50 dark:bg-[#0D1117] flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 dark:text-[#E6EDF3]">Catalogue Preview (Top 100)</h3>
            </div>
            
            <div className="flex-1 overflow-auto">
              {fetching ? (
                <div className="flex justify-center items-center h-full p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00A8FF] dark:text-[#7EE787]" />
                </div>
              ) : products.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 dark:text-[#8B949E] uppercase bg-slate-50 dark:bg-[#0D1117] sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Part Number</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#21262D]">
                    {products.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[rgba(126,231,135,0.04)]">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-[#E6EDF3]">{p.part_number}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-[#8B949E] max-w-xs truncate" title={p.description}>{p.description}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-[#8B949E]">{p.type}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-[#8B949E]">{p.size}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-[#8B949E]">{p.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-[#21262D] mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-[#E6EDF3] mb-1">No catalogue found</h3>
                  <p className="text-slate-500 dark:text-[#8B949E] max-w-sm">
                    Upload an Excel file to populate your product catalogue. This will be used to match items in your RFQs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
