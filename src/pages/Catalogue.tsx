import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Trash2, Plus, Upload, Search, ChevronDown, ChevronRight, MoreVertical, Download, X, FolderPlus, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

interface CatalogueItem {
  id: string;
  category: string;
  value: string;
  is_available: boolean;
}

const PRIORITY_ORDER = [
  'ValveType', 'ValveSize', 'ValveClass', 'ValveMOC', 'Trim', 
  'END_DETAIL', 'OPERATOR', 'Bolting', 'Gasket', 'Packing_Stem_Seal', 
  'Model', 'STANDARD', 'SERVICE'
];

function formatCategoryName(cat: string) {
  return cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-xl border shadow-lg flex items-center gap-3 z-50 ${
      type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-[#161B22] dark:border-[#2EA043] dark:text-[#7EE787]' 
      : 'bg-red-50 border-red-200 text-red-700 dark:bg-[#161B22] dark:border-[#F85149] dark:text-[#F85149]'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
    </div>
  );
};

export function Catalogue() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [emptyCategories, setEmptyCategories] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadCatalogue();
  }, [user]);

  const loadCatalogue = async () => {
    setFetching(true);
    setError(null);
    try {
      let allItems: CatalogueItem[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('catalogue_items')
          .select('id, category, value, is_available')
          .eq('user_id', user?.id)
          .range(from, from + batchSize - 1)
          .order('category', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) break;
        allItems = [...allItems, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }
      
      console.log(`Total rows returned: ${allItems.length}`);
      const uniqueCategories = Array.from(new Set(allItems.map(item => item.category)));
      console.log('Unique categories:', uniqueCategories);

      setItems(allItems);
    } catch (err: any) {
      console.error('Failed to load catalogue:', err);
      setError('Failed to load catalogue data. Please try again.');
    } finally {
      setFetching(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Always clear existing data for the user before importing
      const { error: deleteError } = await supabase.from('catalogue_items').delete().eq('user_id', user.id);
      if (deleteError) {
        console.error('Failed to clear old data', deleteError);
        throw new Error('Failed to clear existing catalogue data.');
      }

      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const newItems: any[] = [];
      const existingSet = new Set<string>();

      for (const row of rows) {
        const cat = String(row[0] ?? '').trim();
        const val = String(row[1] ?? '').trim();
        if (!cat || !val || val === '-') continue;

        const key = `${cat.toLowerCase()}|${val.toLowerCase()}`;
        if (!existingSet.has(key)) {
          newItems.push({
            user_id: user.id,
            category: cat,
            value: val,
            is_available: true,
          });
          existingSet.add(key);
        }
      }

      if (newItems.length === 0) {
        throw new Error('No new valid catalogue items found in the Excel file.');
      }

      const BATCH_SIZE = 200;
      let insertedCount = 0;

      for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
        const batch = newItems.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase.from('catalogue_items').insert(batch);
        if (insertError) throw new Error(`Batch insert failed: ${insertError.message}`);
        insertedCount += batch.length;
      }

      showToast(`Successfully imported ${insertedCount} items.`);
      await loadCatalogue();
    } catch (err: any) {
      console.error('Excel import failed:', err);
      setError(err.message || 'Failed to import from Excel.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    setEmptyCategories(prev => new Set(prev).add(newCategoryName.trim()));
    setNewCategoryName('');
    setShowNewCategory(false);
    showToast(`Category "${newCategoryName}" created.`);
  };

  const groupedItems = useMemo(() => {
    const map = new Map<string, CatalogueItem[]>();
    
    PRIORITY_ORDER.forEach(cat => map.set(cat, []));
    emptyCategories.forEach(cat => map.set(cat, []));

    items.forEach(item => {
      // Find case-insensitive match in PRIORITY_ORDER or use raw category
      const priorityMatch = PRIORITY_ORDER.find(p => p.toLowerCase() === item.category.toLowerCase());
      const catKey = priorityMatch || item.category;

      if (!map.has(catKey)) {
        map.set(catKey, []);
      }
      if (!searchQuery || item.value.toLowerCase().includes(searchQuery.toLowerCase()) || catKey.toLowerCase().includes(searchQuery.toLowerCase())) {
        map.get(catKey)!.push(item);
      }
    });

    if (searchQuery) {
      for (const [cat, catItems] of map.entries()) {
        if (catItems.length === 0 && !cat.toLowerCase().includes(searchQuery.toLowerCase())) {
          map.delete(cat);
        }
      }
    }

    console.log('Total categories loaded: ' + map.size + ' — ' + Array.from(map.keys()).join(', '));

    return map;
  }, [items, searchQuery, emptyCategories]);

  const sortedCategories = useMemo(() => {
    const cats = Array.from(groupedItems.keys()) as string[];
    return cats.sort((a: string, b: string) => {
      const idxA = PRIORITY_ORDER.indexOf(a);
      const idxB = PRIORITY_ORDER.indexOf(b);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [groupedItems]);

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-[#E6EDF3] flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-[#00A8FF] dark:text-[#7EE787]" />
            Catalogue Manager
          </h1>
          <p className="text-slate-600 dark:text-[#8B949E] mt-1">
            Manage your dynamic product catalogue and categories.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCategory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-[#30363D] text-slate-700 dark:text-[#E6EDF3] rounded-lg text-sm font-medium transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New Category
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#00A8FF] hover:bg-[#0090DB] dark:bg-[#238636] dark:hover:bg-[#2EA043] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import Excel
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search items or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] rounded-lg text-sm text-slate-900 dark:text-[#E6EDF3] focus:ring-2 focus:ring-[#00A8FF] dark:focus:ring-[#7EE787]"
          />
        </div>
        {showNewCategory && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
              className="px-4 py-2 bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] rounded-lg text-sm text-slate-900 dark:text-[#E6EDF3] focus:ring-2 focus:ring-[#00A8FF] dark:focus:ring-[#7EE787]"
              autoFocus
            />
            <button onClick={handleAddNewCategory} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 dark:bg-[#238636] dark:text-white dark:hover:bg-[#2EA043]">
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <button onClick={() => setShowNewCategory(false)} className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 dark:bg-[#21262D] dark:text-[#E6EDF3] dark:hover:bg-[#30363D]">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-[#F85149]/10 border border-red-200 dark:border-[#F85149]/30 rounded-xl flex items-center justify-between text-red-600 dark:text-[#F85149]">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
          <button onClick={loadCatalogue} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#21262D] rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-[#30363D] transition-colors">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {fetching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D] p-6 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-[#30363D] rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-10 bg-slate-100 dark:bg-[#0D1117] rounded"></div>
                <div className="h-10 bg-slate-100 dark:bg-[#0D1117] rounded"></div>
                <div className="h-10 bg-slate-100 dark:bg-[#0D1117] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedCategories.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D]">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-[#30363D] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-[#E6EDF3]">Catalogue is empty</h3>
          <p className="text-slate-500 dark:text-[#8B949E] mt-2 mb-6">Import an Excel file or create a new category to get started.</p>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A8FF] hover:bg-[#0090DB] dark:bg-[#238636] dark:hover:bg-[#2EA043] text-white rounded-lg text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {sortedCategories.map(category => (
            <CategoryCard 
              key={category} 
              category={category} 
              items={groupedItems.get(category) || []} 
              onUpdate={loadCatalogue}
              showToast={showToast}
              onDeleteCategory={() => {
                setEmptyCategories(prev => {
                  const next = new Set(prev);
                  next.delete(category);
                  return next;
                });
                loadCatalogue();
              }}
            />
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

const CategoryCard: React.FC<{ category: string, items: CatalogueItem[], onUpdate: () => Promise<void> | void, showToast: (msg: string, type?: 'success'|'error') => void, onDeleteCategory: () => void }> = ({ category, items, onUpdate, showToast, onDeleteCategory }) => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [newItemValue, setNewItemValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleAdd = async () => {
    if (!newItemValue.trim() || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('catalogue_items').insert({
        user_id: user.id,
        category,
        value: newItemValue.trim(),
        is_available: true
      });
      if (error) throw error;
      showToast(`Added "${newItemValue}" to ${formatCategoryName(category)}`);
      setNewItemValue('');
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('catalogue_items').update({ is_available: !current }).eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('catalogue_items').delete().eq('id', id);
      if (error) throw error;
      showToast('Item deleted');
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkToggle = async (enable: boolean) => {
    setShowMenu(false);
    if (!user) return;
    try {
      const ids = items.map(i => i.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from('catalogue_items').update({ is_available: enable }).in('id', ids);
      if (error) throw error;
      showToast(`All items ${enable ? 'enabled' : 'disabled'}`);
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async () => {
    setShowMenu(false);
    if (!user || !window.confirm(`Delete category "${formatCategoryName(category)}" and all its items?`)) return;
    try {
      const { error } = await supabase.from('catalogue_items').delete().eq('user_id', user.id).eq('category', category);
      if (error) throw error;
      showToast('Category deleted');
      onDeleteCategory();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExport = () => {
    setShowMenu(false);
    const content = items.map(i => i.value).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}_items.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#21262D] shadow-sm flex flex-col max-h-[600px]">
      <div className="p-4 border-b border-slate-100 dark:border-[#21262D] flex items-center justify-between sticky top-0 bg-white dark:bg-[#161B22] rounded-t-xl z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#E6EDF3]">{formatCategoryName(category)}</h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#21262D] text-xs font-medium text-slate-600 dark:text-[#8B949E]">
            {items.length}
          </span>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#21262D] rounded-lg text-slate-500 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] rounded-xl shadow-lg z-30 py-1">
                <button onClick={() => handleBulkToggle(true)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-[#E6EDF3] hover:bg-slate-50 dark:hover:bg-[#21262D]">Enable All</button>
                <button onClick={() => handleBulkToggle(false)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-[#E6EDF3] hover:bg-slate-50 dark:hover:bg-[#21262D]">Disable All</button>
                <button onClick={handleExport} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-[#E6EDF3] hover:bg-slate-50 dark:hover:bg-[#21262D] flex items-center justify-between">Export <Download className="w-4 h-4" /></button>
                <div className="h-px bg-slate-100 dark:bg-[#30363D] my-1" />
                <button onClick={handleDeleteCategory} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-[#F85149] hover:bg-red-50 dark:hover:bg-[#F85149]/10 flex items-center justify-between">Delete Category <Trash2 className="w-4 h-4" /></button>
              </div>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[100px]">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#8B949E] italic text-center py-4">No items found</p>
          ) : (
            <ul className="space-y-2">
              {items.map(item => (
                <li key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] rounded-lg group hover:border-[#00A8FF]/30 dark:hover:border-[#7EE787]/30 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={item.is_available}
                      onChange={() => handleToggle(item.id, item.is_available)}
                      className="w-4 h-4 shrink-0 text-[#00A8FF] dark:text-[#7EE787] bg-white dark:bg-[#161B22] border-slate-300 dark:border-[#30363D] rounded focus:ring-[#00A8FF] dark:focus:ring-[#7EE787] focus:ring-2 cursor-pointer"
                    />
                    <span className={`text-sm truncate ${item.is_available ? 'text-slate-900 dark:text-[#E6EDF3]' : 'text-slate-500 dark:text-[#8B949E] line-through'}`} title={item.value}>
                      {item.value}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-400 hover:text-red-600 dark:hover:text-[#F85149] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="p-4 border-t border-slate-100 dark:border-[#21262D] bg-slate-50/50 dark:bg-[#0D1117]/50 rounded-b-xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add new item..."
              className="flex-1 px-3 py-2 bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] rounded-lg text-sm text-slate-900 dark:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#00A8FF] dark:focus:ring-[#7EE787]"
              disabled={loading}
            />
            <button
              onClick={handleAdd}
              disabled={loading || !newItemValue.trim()}
              className="p-2 bg-[#00A8FF] hover:bg-[#0090DB] dark:bg-[#238636] dark:hover:bg-[#2EA043] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
