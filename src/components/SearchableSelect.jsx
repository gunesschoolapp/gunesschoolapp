import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Searchable dropdown select component
 * Props:
 *   value, onValueChange, placeholder, options: [{value, label, subtitle?}], className
 */
export default function SearchableSelect({ value, onValueChange, placeholder = 'Seçin...', options = [], className }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = options.find(o => o.value === value);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.subtitle && o.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch(''); }}
        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          {/* Search input */}
          <div className="flex items-center border-b px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground mr-2 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ara..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* Options */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Sonuç bulunamadı</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onValueChange(o.value); setOpen(false); setSearch(''); }}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    value === o.value && 'bg-accent/50'
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span>{o.label}</span>
                    {o.subtitle && <span className="text-xs text-muted-foreground">{o.subtitle}</span>}
                  </div>
                  {value === o.value && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4 text-primary" />
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}