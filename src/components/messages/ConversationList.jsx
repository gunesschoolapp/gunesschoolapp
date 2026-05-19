import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import ChannelBadge from './ChannelBadge';
import { format, isToday } from 'date-fns';

export default function ConversationList({ conversations, selectedId, onSelect, onNew }) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c =>
    (c.student_name || c.contact_identifier || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isToday(d) ? format(d, 'HH:mm') : format(d, 'dd MMM');
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Conversations</h2>
          <Button size="icon" variant="ghost" onClick={onNew} className="h-8 w-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet</div>
        ) : (
          filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${selectedId === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-foreground truncate">
                      {conv.student_name || conv.contact_identifier || 'Unknown'}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <ChannelBadge channel={conv.channel} />
                  {conv.last_message && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{conv.last_message}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                  {formatTime(conv.last_message_at)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}