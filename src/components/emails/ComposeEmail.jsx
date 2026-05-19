import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Send, X, Minus, Maximize2, Paperclip, Trash2,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link, Type, Palette
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px'];
const COLORS = ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
  '#ff0000', '#ff4500', '#ff8c00', '#ffd700', '#008000', '#0000ff', '#4b0082', '#ee82ee',
  '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#cfe2f3', '#d9d2e9'];

function ToolbarButton({ onClick, title, active, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
    >
      {children}
    </button>
  );
}

function ColorPicker({ onColor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        title="Yazı Rengi"
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground flex items-center gap-0.5"
      >
        <Palette className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-[9999] bg-card border rounded-lg shadow-xl p-2 w-44">
          <div className="grid grid-cols-8 gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={e => { e.preventDefault(); onColor(c); setOpen(false); }}
                className="w-4 h-4 rounded-sm border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FontSizePicker({ onSize }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('14px');
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-muted text-xs text-muted-foreground min-w-[40px]"
        title="Yazı Boyutu"
      >
        <Type className="w-3 h-3" />
        <span>{current}</span>
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-[9999] bg-card border rounded-lg shadow-xl py-1 w-20">
          {FONT_SIZES.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSize(s); setCurrent(s); setOpen(false); }}
              className="w-full text-left px-3 py-1 text-xs hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComposeEmail({ onClose, replyTo = null, forwardOf = null, defaultAccount = null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editorRef = useRef(null);
  const [minimized, setMinimized] = useState(false);
  const [showCc, setShowCc] = useState(!!(replyTo?.cc));
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const savedSelection = useRef(null);

  const [form, setForm] = useState({
    account_id: defaultAccount?.id || '',
    to: replyTo ? (replyTo.from_email || '') : '',
    cc: replyTo?.cc || '',
    bcc: '',
    subject: replyTo
      ? (replyTo.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject || ''}`)
      : forwardOf
        ? `Fwd: ${forwardOf.subject || ''}`
        : '',
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: () => base44.entities.EmailAccount.filter({ status: 'active' }),
  });

  useEffect(() => {
    if (accounts.length > 0 && !form.account_id) {
      const def = accounts.find(a => a.is_default) || accounts[0];
      setForm(f => ({ ...f, account_id: def.id }));
    }
  }, [accounts]);

  // Initialize editor content
  useEffect(() => {
    if (!editorRef.current) return;
    const selectedAcc = accounts.find(a => a.id === form.account_id) || accounts.find(a => a.is_default) || accounts[0];
    const signature = selectedAcc?.from_name
      ? `<br><br><div style="color:#666;border-top:1px solid #eee;padding-top:8px;font-size:13px">${selectedAcc.from_name}${selectedAcc.email ? `<br>${selectedAcc.email}` : ''}</div>`
      : '';

    let content = '';
    if (replyTo) {
      content = `<p><br></p>${signature}<br><hr style="border:none;border-top:1px solid #e0e0e0;margin:8px 0"><p style="color:#666;font-size:12px"><strong>Kimden:</strong> ${replyTo.from_name || replyTo.from_email}<br><strong>Tarih:</strong> ${replyTo.received_at ? new Date(replyTo.received_at).toLocaleString('tr-TR') : ''}<br><strong>Konu:</strong> ${replyTo.subject}</p><br>${replyTo.body || ''}`;
    } else if (forwardOf) {
      content = `<p><br></p>${signature}<br><hr style="border:none;border-top:1px solid #e0e0e0;margin:8px 0"><p style="color:#666;font-size:12px"><strong>İletilen Mesaj</strong><br><strong>Kimden:</strong> ${forwardOf.from_name || forwardOf.from_email}<br><strong>Konu:</strong> ${forwardOf.subject}</p><br>${forwardOf.body || ''}`;
    } else {
      content = `<p><br></p>${signature}`;
    }
    editorRef.current.innerHTML = content;
    // Place cursor at start
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(editorRef.current, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [accounts.length]);

  const exec = useCallback((cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }, []);

  const handleFontSize = (size) => {
    editorRef.current?.focus();
    document.execCommand('fontSize', false, '7');
    const fontEls = editorRef.current?.querySelectorAll('font[size="7"]');
    fontEls?.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = size;
    });
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) savedSelection.current = sel.getRangeAt(0);
  };

  const restoreSelection = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
  };

  const handleInsertLink = () => {
    saveSelection();
    setShowLinkDialog(true);
    setLinkUrl('');
  };

  const confirmLink = () => {
    restoreSelection();
    if (linkUrl) exec('createLink', linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`);
    setShowLinkDialog(false);
  };

  const getBody = () => editorRef.current?.innerHTML || '';

  const handleSend = async () => {
    if (!form.to || !form.subject) return toast({ title: 'Alıcı ve konu zorunlu', variant: 'destructive' });
    setSending(true);
    try {
      await base44.functions.invoke('sendEmail', {
        account_id: form.account_id,
        to: form.to,
        cc: form.cc,
        bcc: form.bcc,
        subject: form.subject,
        body: getBody(),
        in_reply_to_id: replyTo?.id || null,
      });
      toast({ title: 'E-posta gönderildi ✓' });
      queryClient.invalidateQueries({ queryKey: ['sent-emails'] });
      onClose();
    } catch (err) {
      toast({ title: 'Gönderilemedi', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === form.account_id);

  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 bg-card border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setMinimized(false)}>
          <span className="font-medium text-sm truncate">{form.subject || 'Yeni E-posta'}</span>
          <div className="flex gap-1">
            <button onClick={e => { e.stopPropagation(); setMinimized(false); }} className="p-1 hover:bg-muted rounded"><Maximize2 className="w-3.5 h-3.5" /></button>
            <button onClick={e => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[580px] max-w-[95vw] bg-card border rounded-xl shadow-2xl flex flex-col" style={{ maxHeight: '82vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-t-xl flex-shrink-0">
        <span className="font-medium text-sm">{replyTo ? 'Yanıtla' : forwardOf ? 'İlet' : 'Yeni Mesaj'}</span>
        <div className="flex gap-1">
          <button onClick={() => setMinimized(true)} className="p-1 hover:bg-white/20 rounded"><Minus className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col min-h-0">
        {/* Account */}
        {accounts.length > 1 && (
          <div className="px-4 py-2 border-b flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Kimden</span>
            <select className="flex-1 text-sm bg-transparent outline-none" value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.from_name ? `${a.from_name} <${a.email}>` : a.email}</option>)}
            </select>
          </div>
        )}
        {accounts.length === 1 && selectedAccount && (
          <div className="px-4 py-2 border-b flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Kimden</span>
            <span className="text-sm text-foreground/80">{selectedAccount.from_name ? `${selectedAccount.from_name} <${selectedAccount.email}>` : selectedAccount.email}</span>
          </div>
        )}

        {/* To */}
        <div className="px-4 py-2 border-b flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Kime</span>
          <Input className="flex-1 border-0 shadow-none p-0 h-auto text-sm focus-visible:ring-0" placeholder="Alıcı ekle..." value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
          <div className="flex gap-2 text-xs text-muted-foreground">
            {!showCc && <button onClick={() => setShowCc(true)} className="hover:text-foreground">CC</button>}
            {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:text-foreground">BCC</button>}
          </div>
        </div>

        {showCc && (
          <div className="px-4 py-2 border-b flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">CC</span>
            <Input className="flex-1 border-0 shadow-none p-0 h-auto text-sm focus-visible:ring-0" placeholder="CC alıcıları..." value={form.cc} onChange={e => setForm({ ...form, cc: e.target.value })} />
            <button onClick={() => { setShowCc(false); setForm({ ...form, cc: '' }); }}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
        )}

        {showBcc && (
          <div className="px-4 py-2 border-b flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">BCC</span>
            <Input className="flex-1 border-0 shadow-none p-0 h-auto text-sm focus-visible:ring-0" placeholder="BCC alıcıları..." value={form.bcc} onChange={e => setForm({ ...form, bcc: e.target.value })} />
            <button onClick={() => { setShowBcc(false); setForm({ ...form, bcc: '' }); }}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
        )}

        <div className="px-4 py-2 border-b">
          <Input className="border-0 shadow-none p-0 h-auto text-sm focus-visible:ring-0" placeholder="Konu" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
        </div>

        {/* Editor Body */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="flex-1 px-4 py-3 text-sm outline-none overflow-y-auto"
          style={{ minHeight: '220px', maxHeight: '35vh', lineHeight: '1.6' }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 border-t bg-muted/30 flex-shrink-0">
        <ToolbarButton onClick={() => exec('bold')} title="Kalın (Ctrl+B)"><Bold className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="İtalik (Ctrl+I)"><Italic className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="Altı çizili (Ctrl+U)"><Underline className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('strikeThrough')} title="Üstü çizili"><Strikethrough className="w-3.5 h-3.5" /></ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <FontSizePicker onSize={handleFontSize} />
        <ColorPicker onColor={(c) => exec('foreColor', c)} />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Madde listesi"><List className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numaralı liste"><ListOrdered className="w-3.5 h-3.5" /></ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton onClick={handleInsertLink} title="Link ekle"><Link className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('removeFormat')} title="Formatı temizle"><span className="text-xs font-mono">Tx</span></ToolbarButton>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="absolute inset-x-0 bottom-16 mx-4 bg-card border rounded-lg shadow-xl p-3 z-50 flex gap-2">
          <Input
            placeholder="https://..."
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmLink(); if (e.key === 'Escape') setShowLinkDialog(false); }}
            autoFocus
            className="flex-1 text-sm h-8"
          />
          <Button size="sm" onClick={confirmLink} className="h-8 px-3">Ekle</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowLinkDialog(false)} className="h-8 px-2"><X className="w-3.5 h-3.5" /></Button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0">
        <Button size="sm" onClick={handleSend} disabled={sending || !form.to || !form.subject} className="rounded-full px-5">
          {sending ? 'Gönderiliyor...' : <><Send className="w-3.5 h-3.5 mr-1.5" />Gönder</>}
        </Button>
        <button className="p-2 hover:bg-muted rounded-full text-muted-foreground"><Paperclip className="w-4 h-4" /></button>
        <div className="flex-1" />
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}