import React, { useState, useRef } from 'react';
import { Star, Paperclip, CheckSquare, Square, Trash2, Archive, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-amber-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500'];
const getAvatarColor = (str) => avatarColors[(str?.charCodeAt(0) || 0) % avatarColors.length];
const getInitials = (name, email) => {
  if (name) return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return email?.[0]?.toUpperCase() || '?';
};
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return format(d, 'HH:mm');
    if (now.getFullYear() === d.getFullYear()) return format(d, 'd MMM');
    return format(d, 'dd/MM/yy');
  } catch { return ''; }
};

function SwipeableEmailRow({ email, isSentFolder, onSelect, onStar, isSelected, onToggleSelect, bulkMode, onSwipeDelete, onSwipeStar, onSwipeArchive }) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const rowRef = useRef(null);

  const THRESHOLD = 80;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (dy > 20 && !isSwiping) return; // vertical scroll, ignore
    if (Math.abs(dx) > 10) {
      setIsSwiping(true);
      setSwipeX(Math.max(-160, Math.min(160, dx)));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX < -THRESHOLD) {
      // Swipe left → delete
      setSwipeX(-200);
      setTimeout(() => { onSwipeDelete(email); setSwipeX(0); }, 300);
    } else if (swipeX > THRESHOLD) {
      // Swipe right → star
      onSwipeStar(email);
      setSwipeX(0);
    } else {
      setSwipeX(0);
    }
    setIsSwiping(false);
    startX.current = null;
  };

  const isUnread = !email.read && !isSentFolder;
  const displayName = isSentFolder ? email.to : (email.from_name || email.from_email || '?');
  const displayEmail = isSentFolder ? email.to : email.from_email;
  const dateStr = isSentFolder ? email.created_date : email.received_at;

  return (
    <div className="relative overflow-hidden">
      {/* Left action (star) - swipe right */}
      <div className={`absolute inset-y-0 left-0 flex items-center px-6 bg-amber-400 transition-opacity ${swipeX > 20 ? 'opacity-100' : 'opacity-0'}`}>
        <Star className="w-6 h-6 text-white fill-white" />
      </div>
      {/* Right action (delete) - swipe left */}
      <div className={`absolute inset-y-0 right-0 flex items-center px-6 bg-red-500 transition-opacity ${swipeX < -20 ? 'opacity-100' : 'opacity-0'}`}>
        <Trash2 className="w-6 h-6 text-white" />
      </div>

      <div
        ref={rowRef}
        style={{ transform: `translateX(${swipeX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`group relative flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors ${
          isUnread ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'bg-card'
        } ${isSelected ? '!bg-primary/5' : ''}`}
        onClick={() => !isSwiping && onSelect(email)}
      >
        {/* Checkbox / Avatar */}
        <div
          className="relative flex-shrink-0 w-10 h-10 cursor-pointer"
          onClick={e => { e.stopPropagation(); onToggleSelect && onToggleSelect(email.id, e); }}
        >
          {isSelected ? (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold group-hover:hidden ${getAvatarColor(displayName)}`}>
                {getInitials(displayName, displayEmail)}
              </div>
              <div className="w-10 h-10 rounded-full bg-muted hidden group-hover:flex items-center justify-center">
                <Square className="w-5 h-5 text-muted-foreground/60" />
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate ${isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
              {isSentFolder ? `Kime: ${displayName}` : displayName}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {email.has_attachments && <Paperclip className="w-3.5 h-3.5 text-muted-foreground/50" />}
              <span className={`text-[11px] ${isUnread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {formatDate(dateStr)}
              </span>
            </div>
          </div>
          <p className={`text-[13px] truncate ${isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            {email.subject || '(Konu yok)'}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">
            {email.snippet || email.body?.replace(/<[^>]+>/g, '').slice(0, 100) || ''}
          </p>
        </div>

        {/* Star */}
        {!isSentFolder && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onStar(email); }}
            className="p-1.5 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <Star className={`w-4 h-4 ${email.starred ? 'text-amber-400 fill-amber-400 opacity-100' : 'text-muted-foreground/40'}`} />
          </button>
        )}

        {/* Unread dot */}
        {isUnread && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
        {isSentFolder && email.status === 'failed' && (
          <Badge variant="destructive" className="text-[9px] px-1 py-0 flex-shrink-0">Hata</Badge>
        )}
      </div>
    </div>
  );
}

export default function EmailList({ emails, isSentFolder, onSelect, onStar, selected = [], onToggleSelect, bulkMode, onBulkSelectAll, onDelete, onArchive, onSetSelected }) {
  const lastClickedIndex = useRef(null);
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Star className="w-8 h-8 opacity-30" />
        </div>
        <p className="text-sm font-medium">Bu klasörde e-posta yok</p>
      </div>
    );
  }

  const allSelected = emails.length > 0 && emails.every(e => selected.includes(e.id));

  return (
    <div>
      {/* Select All Row */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
        <button
          onClick={() => onBulkSelectAll && onBulkSelectAll(allSelected ? [] : emails.map(e => e.id))}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {allSelected
            ? <CheckSquare className="w-4 h-4 text-primary" />
            : <Square className="w-4 h-4" />
          }
          <span>{allSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}</span>
        </button>
        {selected.length > 0 && (
          <span className="ml-auto text-xs text-primary font-medium">{selected.length} seçili</span>
        )}
      </div>

      <div className="divide-y divide-border">
        {emails.map((email, index) => (
          <SwipeableEmailRow
            key={email.id}
            email={email}
            isSentFolder={isSentFolder}
            onSelect={(e) => {
              onSelect(e);
              lastClickedIndex.current = index;
            }}
            onStar={onStar}
            isSelected={selected.includes(email.id)}
            onToggleSelect={(id, e) => {
              if (e?.shiftKey && lastClickedIndex.current !== null) {
                const from = Math.min(lastClickedIndex.current, index);
                const to = Math.max(lastClickedIndex.current, index);
                const rangeIds = emails.slice(from, to + 1).map(em => em.id);
                const merged = Array.from(new Set([...selected, ...rangeIds]));
                onSetSelected && onSetSelected(merged);
              } else {
                onToggleSelect && onToggleSelect(id);
                lastClickedIndex.current = index;
              }
            }}
            bulkMode={bulkMode}
            onSwipeDelete={(e) => onDelete && onDelete(e)}
            onSwipeStar={(e) => onStar && onStar(e)}
            onSwipeArchive={(e) => onArchive && onArchive(e)}
          />
        ))}
      </div>
    </div>
  );
}