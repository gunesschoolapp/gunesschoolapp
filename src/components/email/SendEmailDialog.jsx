import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, CheckCircle } from 'lucide-react';

export default function SendEmailDialog({ open, onClose, toEmail, toName }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [accountId, setAccountId] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: () => base44.entities.EmailAccount.filter({ status: 'active' }),
    enabled: open,
  });

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError('');
    const res = await base44.functions.invoke('sendEmail', {
      to: toEmail,
      subject,
      body: body.replace(/\n/g, '<br>'),
      email_account_id: accountId || undefined,
    });
    setSending(false);
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setSent(true);
      setTimeout(() => { setSent(false); onClose(); setSubject(''); setBody(''); }, 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>E-posta Gönder</DialogTitle>
        </DialogHeader>
        {sent ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-green-600">
            <CheckCircle className="w-12 h-12" />
            <p className="font-medium">Gönderildi!</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label>Alıcı</Label>
              <Input className="mt-1" value={`${toName} <${toEmail}>`} disabled />
            </div>
            {accounts.length > 1 && (
              <div>
                <Label>Gönderen Hesap</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Varsayılan hesap" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.email}){acc.is_default ? ' ★' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Konu *</Label>
              <Input className="mt-1" placeholder="E-posta konusu" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>Mesaj *</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[140px] resize-none"
                placeholder="Mesajınızı yazın..."
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>İptal</Button>
              <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()} className="gap-2">
                <Send className="w-4 h-4" />
                {sending ? 'Gönderiliyor...' : 'Gönder'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}