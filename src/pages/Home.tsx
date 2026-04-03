import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Zap, Database, FileSpreadsheet, ArrowRight } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00A8FF]/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-[#21262D] mb-8">
              <span className="flex h-2 w-2 rounded-full bg-[#00A8FF] dark:bg-[#7EE787] animate-pulse"></span>
              <span className="text-sm font-medium text-slate-800 dark:text-[#E6EDF3]">Valve AI Pro is now live</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-slate-900 dark:text-[#E6EDF3] mb-8 leading-tight">
              Precision Automation for <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A8FF] to-[#0055FF] dark:from-[#7EE787] dark:to-[#3FB950]">
                Valve Engineering
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-[#8B949E] mb-12 max-w-3xl mx-auto leading-relaxed">
              Upload your RFQ Excel files and let our deterministic rule-based engine map columns, match products from your catalogue, and generate working sheets with 100% accuracy.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#00A8FF] to-[#008DE6] hover:from-[#008DE6] hover:to-[#0070B8] dark:from-[#238636] dark:to-[#2EA043] dark:hover:from-[#2EA043] dark:hover:to-[#3FB950] text-white text-lg font-medium rounded-xl shadow-[0_0_20px_rgba(0,168,255,0.4)] hover:shadow-[0_0_30px_rgba(0,168,255,0.6)] dark:shadow-[0_0_20px_rgba(126,231,135,0.2)] dark:hover:shadow-[0_0_30px_rgba(126,231,135,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-[#161B22] text-slate-900 dark:text-[#E6EDF3] text-lg font-medium rounded-xl border border-slate-200 dark:border-[#21262D] hover:border-slate-300 dark:hover:border-[#30363D] transition-colors flex items-center justify-center"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-24 bg-slate-50 dark:bg-[#0D1117] border-t border-slate-200 dark:border-[#21262D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-[#E6EDF3] mb-4">Deterministic Systems Engineering</h2>
              <p className="text-slate-600 dark:text-[#8B949E] max-w-2xl mx-auto">No AI hallucinations. 100% rule-based matching engine built for industrial precision.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-[#161B22] p-8 rounded-2xl border border-slate-200 dark:border-[#21262D] hover:border-[#00A8FF]/50 dark:hover:border-[#7EE787]/50 transition-colors group">
                <div className="w-14 h-14 bg-blue-50 dark:bg-[rgba(126,231,135,0.1)] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Database className="w-7 h-7 text-[#00A8FF] dark:text-[#7EE787]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#E6EDF3] mb-3">Catalogue Matching</h3>
                <p className="text-slate-600 dark:text-[#8B949E] leading-relaxed">
                  Upload your product catalogue and let our engine normalize, tokenize, and score matches based on description, size, rating, and material.
                </p>
              </div>

              <div className="bg-white dark:bg-[#161B22] p-8 rounded-2xl border border-slate-200 dark:border-[#21262D] hover:border-[#00A8FF]/50 dark:hover:border-[#7EE787]/50 transition-colors group">
                <div className="w-14 h-14 bg-blue-50 dark:bg-[rgba(126,231,135,0.1)] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-7 h-7 text-[#00A8FF] dark:text-[#7EE787]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#E6EDF3] mb-3">Batch Processing</h3>
                <p className="text-slate-600 dark:text-[#8B949E] leading-relaxed">
                  Process hundreds of RFQ rows instantly. Map your Excel columns dynamically and generate ready-to-use working sheets.
                </p>
              </div>

              <div className="bg-white dark:bg-[#161B22] p-8 rounded-2xl border border-slate-200 dark:border-[#21262D] hover:border-[#00A8FF]/50 dark:hover:border-[#7EE787]/50 transition-colors group">
                <div className="w-14 h-14 bg-blue-50 dark:bg-[rgba(126,231,135,0.1)] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-7 h-7 text-[#00A8FF] dark:text-[#7EE787]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#E6EDF3] mb-3">Rule Engine</h3>
                <p className="text-slate-600 dark:text-[#8B949E] leading-relaxed">
                  Apply complex IF-THEN rules. First matching rule wins. Support for AND/OR conditions to automate your engineering decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-[#21262D] bg-white dark:bg-[#0D1117] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#00A8FF] dark:text-[#7EE787]" />
            <span className="text-lg font-display font-bold text-slate-900 dark:text-[#E6EDF3]">VALVE AI PRO</span>
          </div>
          <p className="text-slate-500 dark:text-[#8B949E] text-sm">
            © 2026 ApexPredator AI Solutions. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
