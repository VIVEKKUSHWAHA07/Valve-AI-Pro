/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { Play, CheckCircle2, XCircle, Loader2, Upload, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [jobId, setJobId] = useState(crypto.randomUUID());
  const [rfqDescription, setRfqDescription] = useState('Looking for a 2 inch stainless steel ball valve');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const currentJobId = jobId || crypto.randomUUID();
      const res = await fetch(`/api/jobs/${currentJobId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rfqs: [
            { id: crypto.randomUUID(), description: rfqDescription }
          ]
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process job');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError('');
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/jobs/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process file');
      }
      
      // Download the returned Excel file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${file.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Clear file input
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Valve AI Pro</h1>
          <p className="text-slate-500 mt-2">Deterministic RFQ Matching Engine</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Single RFQ Testing */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Single RFQ Test</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job ID</label>
                <input 
                  type="text" 
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Test RFQ Description</label>
                <textarea 
                  value={rfqDescription}
                  onChange={(e) => setRfqDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button 
              onClick={handleProcess}
              disabled={loading || uploading || !rfqDescription.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Process RFQ
            </button>
          </div>

          {/* Excel Batch Processing */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Batch Excel Processing</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-sm text-slate-600 mb-4">Upload an Excel file containing RFQ descriptions to process them in bulk.</p>
                
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  ref={fileInputRef}
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Select File
                </button>
                
                {file && (
                  <p className="mt-3 text-sm font-medium text-blue-600 truncate max-w-full">
                    {file.name}
                  </p>
                )}
              </div>
            </div>

            <button 
              onClick={handleFileUpload}
              disabled={uploading || loading || !file}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              Process & Download Excel
            </button>
          </div>

          {/* Catalogue Upload */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6 md:col-span-2">
            <h2 className="text-lg font-semibold border-b pb-2">Catalogue Upload</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-sm text-slate-600 mb-4">Upload the full product catalogue (Excel/CSV) to populate the database.</p>
                
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    setUploading(true);
                    setError('');
                    setResult(null);
                    
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      const res = await fetch('/api/catalogue/upload', {
                        method: 'POST',
                        body: formData
                      });
                      
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to upload catalogue');
                      
                      setResult({
                        success: true,
                        message: `Successfully inserted ${data.successCount} rows. Failed: ${data.failCount}.`,
                        distribution: data.distribution
                      });
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setUploading(false);
                      if (e.target) e.target.value = '';
                    }
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-3">
            <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium">Error processing job</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Processing Complete</h2>
            </div>
            
            {result.message ? (
              <div className="space-y-4">
                <p className="text-slate-700 font-medium">{result.message}</p>
                {result.distribution && (
                  <div>
                    <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2">Category Distribution</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(result.distribution).map(([cat, count]) => (
                        <div key={cat} className="bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                          <span className="text-sm text-slate-600 truncate mr-2" title={cat}>{cat}</span>
                          <span className="font-mono text-sm font-medium text-slate-900">{String(count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="text-sm text-slate-500 mb-1">Matched</div>
                <div className="text-2xl font-bold text-slate-900">{result.matchedCount}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="text-sm text-slate-500 mb-1">Errors / No Match</div>
                <div className="text-2xl font-bold text-slate-900">{result.errorCount}</div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-medium text-slate-900 mb-3">Results</h3>
              <div className="space-y-3">
                {result.results.map((r: any, i: number) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-slate-700">RFQ: {r.rfq_id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'matched' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {r.status}
                      </span>
                    </div>
                    
                    {r.detected_category && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category:</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-200 font-medium">{r.detected_category}</span>
                      </div>
                    )}

                    {r.normalized_description && (
                      <div className="mb-3 p-2 bg-slate-100 rounded border border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Normalized Input</span>
                        <span className="text-slate-800">{r.normalized_description}</span>
                      </div>
                    )}
                    
                    {r.extracted_attributes && (r.extracted_attributes.size || r.extracted_attributes.material || r.extracted_attributes.pressure) && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {r.extracted_attributes.size && <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200 font-medium">Size: {r.extracted_attributes.size}</span>}
                        {r.extracted_attributes.material && <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200 font-medium">Material: {r.extracted_attributes.material}</span>}
                        {r.extracted_attributes.pressure && <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded border border-orange-200 font-medium">Pressure: {r.extracted_attributes.pressure}</span>}
                      </div>
                    )}

                    {r.product_id ? (
                      <div className="text-slate-600">
                        <div className="mb-1">Matched Product ID: <span className="font-mono text-slate-900">{r.product_id}</span></div>
                        <div className="flex items-center gap-2">
                          <span>Score: <span className="font-semibold text-slate-900">{(r.match_score * 100).toFixed(1)}%</span></span>
                          {r.match_details && (
                            <span className="text-xs text-slate-400">
                              (Tokens: {(r.match_details.tokenScore * 100).toFixed(0)}%
                              {r.match_details.sizeMatch ? ', Size â' : ''}
                              {r.match_details.materialMatch ? ', Mat â' : ''}
                              {r.match_details.pressureMatch ? ', Press â' : ''})
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">No matching product found in catalogue.</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
