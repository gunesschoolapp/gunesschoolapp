import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GlobalSearchBar({ lang }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const q = query.toLowerCase();
      try {
        const students = await base44.entities.Student.list('-created_date', 200);
        const matched = students
          .filter(s => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.phone?.includes(q))
          .slice(0, 6)
          .map(s => ({ type: 'student', icon: Users, label: s.full_name, sub: s.email || s.phone, path: `/StudentProfile/${s.id}` }));
        setResults(matched);
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (result) => {
    setOpen(false);
    setQuery('');
    navigate(result.path);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={lang === 'tr' ? 'Öğrenci ara...' : 'Search students...'}
          className="w-full h-8 pl-8 pr-8 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && (query.length >= 2) && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground text-center">
              {lang === 'tr' ? 'Aranıyor...' : 'Searching...'}
            </div>
          ) : results.length > 0 ? (
            <div>
              {results.map((r, i) => {
                const Icon = r.icon;
                return (
                  <button
                    key={i}
                    onMouseDown={() => handleSelect(r)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.sub}</p>
                    </div>
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 bg-blue-100 text-blue-700">
                      {lang === 'tr' ? 'Öğrenci' : 'Student'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-xs text-muted-foreground text-center">
              {lang === 'tr' ? 'Sonuç bulunamadı' : 'No results found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}