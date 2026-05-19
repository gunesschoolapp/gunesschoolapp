import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ChevronLeft, Star, Archive, Trash2, Reply, Forward,
  MoreVertical, Paperclip, Mail, AlertTriangle, RotateCcw
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-amber-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500'];
const getAvatarColor = (str) => avatarColors[(str?.charCodeAt(0) || 0) % avatarColors.length];
const getInitials = (name, email) => {
  if (name) return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return email?.[0]?.toUpperCase() || '?';
};

export default function EmailDetail({ email, isSentFolder, onBack, onStar, onArchive, onDelete, onSpam, onReply, onForward, onRestore }) {
  const [showImages, setShowImages] = useState(false);

  const senderName = isSentFolder ? email.to : (email.from_name || email.from_email);
  const senderEmail = isSentFolder ? email.to : email.from_email;
  const dateStr = isSentFolder ? email.created_date : email.received_at;

  const formattedDate = dateStr ? (() => {
    try { return format(new Date(dateStr), "d MMMM yyyy, HH:mm", { locale: tr }); } catch { return ''; }
  })() : '';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-background sticky top-0 z-10 flex-shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-full mr-1">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {email.trash ? (
          <button onClick={onRestore} className="p-2 hover:bg-muted rounded-full" title="Geri Al">
            <RotateCcw className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : (
          <>
            {!isSentFolder && (
              <>
                <button onClick={() => onStar(email)} className="p-2 hover:bg-muted rounded-full">
                  <Star className={`w-5 h-5 ${email.starred ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                </button>
                <button onClick={() => onArchive(email)} className="p-2 hover:bg-muted rounded-full" title="Arşivle">
                  <Archive className="w-5 h-5 text-muted-foreground" />
                </button>
              </>
            )}
            <button onClick={() => onDelete(email)} className="p-2 hover:bg-muted rounded-full" title="Sil">
              <Trash2 className="w-5 h-5 text-muted-foreground" />
            </button>
            {!isSentFolder && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-muted rounded-full"><MoreVertical className="w-5 h-5 text-muted-foreground" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSpam(email)}>
                    <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" /> Spam olarak işaretle
                  </DropdownMenuItem>
                  {email.read
                    ? <DropdownMenuItem onClick={() => {}}>Okunmadı olarak işaretle</DropdownMenuItem>
                    : <DropdownMenuItem onClick={() => {}}>Okundu olarak işaretle</DropdownMenuItem>
                  }
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <h2 className="text-xl font-bold leading-tight">{email.subject || '(Konu yok)'}</h2>

          {/* Sender row */}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(senderName)}`}>
              {getInitials(senderName, senderEmail)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-sm">{senderName}</p>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formattedDate}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
                <p>Kimden: <span className="text-foreground/70">{senderEmail}</span></p>
                {email.to && <p>Kime: <span className="text-foreground/70">{email.to}</span></p>}
                {email.cc && <p>CC: <span className="text-foreground/70">{email.cc}</span></p>}
              </div>
            </div>
          </div>

          {/* Attachments */}
          {email.has_attachments && email.attachments?.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              {email.attachments.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg text-xs hover:bg-muted transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{att.name}</span>
                  {att.size && <span className="text-muted-foreground">({Math.round(att.size / 1024)}KB)</span>}
                </a>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="text-sm text-foreground leading-relaxed border-t pt-4 min-h-[100px]">
            {email.body ? (
              <div dangerouslySetInnerHTML={{ __html: email.body }} />
            ) : email.snippet ? (
              <p className="text-muted-foreground">{email.snippet}</p>
            ) : (
              <span className="text-muted-foreground italic">İçerik yok</span>
            )}
          </div>
        </div>

        {/* Reply / Forward */}
        {!isSentFolder && !email.trash && (
          <div className="flex gap-3 px-4 pb-8">
            <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => onReply(email)}>
              <Reply className="w-4 h-4" /> Yanıtla
            </Button>
            <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => onForward(email)}>
              <Forward className="w-4 h-4" /> İlet
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}