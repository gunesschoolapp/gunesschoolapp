import React from 'react';
import { Button } from '@/components/ui/button';
import { Inbox, Send, Star, Archive, Trash2, AlertTriangle, FileText, X, Pencil, ChevronDown } from 'lucide-react';

const folderIcons = { inbox: Inbox, sent: Send, starred: Star, archived: Archive, trash: Trash2, spam: AlertTriangle, drafts: FileText };

export default function EmailSidebar({ folders, activeFolder, onFolderChange, onCompose, accounts, selectedAccountId, onAccountChange, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <span className="font-bold text-lg">E-postalar</span>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Account Selector */}
      {accounts.length > 1 && (
        <div className="px-4 pb-3">
          <select
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background outline-none focus:ring-2 focus:ring-primary/20"
            value={selectedAccountId || ''}
            onChange={e => onAccountChange(e.target.value)}
          >
            <option value="">Tüm Hesaplar</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name || a.email}</option>
            ))}
          </select>
        </div>
      )}

      {/* Compose Button */}
      <div className="px-4 pb-3">
        <Button onClick={onCompose} className="w-full gap-2 rounded-2xl shadow-sm">
          <Pencil className="w-4 h-4" /> Yeni E-posta
        </Button>
      </div>

      {/* Folder List */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {folders.map(folder => {
          const Icon = folderIcons[folder.id] || Inbox;
          return (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left ${
                activeFolder === folder.id
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0 w-5 h-5" />
              <span className="flex-1">{folder.label}</span>
              {folder.count > 0 && (
                <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${
                  activeFolder === folder.id ? 'bg-primary text-white' : 'bg-primary/15 text-primary'
                }`}>{folder.count}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}