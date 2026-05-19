import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Search, CheckCircle2, XCircle, User, Clock, RefreshCw, Star, Eye, Inbox, Send } from 'lucide-react';
import { format } from 'date-fns';

function EmailRow({ email, onClick }) {
  return (
    <tr
      className={`hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/50 ${!email.read ? 'bg-primary/5 font-medium' : ''}`}
      onClick={() => onClick(email)}
    >
      <td className="px-4 py-3 w-8">
        {email.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
      </td>
      <td className="px-4 py-3 text-sm max-w-[180px] truncate">
        {email.from_name || email.from_email || email.to}
      </td>
      <td className="px-4 py-3 text-sm max-w-xs">
        <span className={!email.read ? 'font-semibold' : ''}>{email.subject || '(konu yok)'}</span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {email.received_at || email.created_date
          ? format(new Date(email.received_at || email.created_date), 'dd MMM HH:mm')
          : '—'}
      </td>
      {email.status !== undefined && (
        <td className="px-4 py-3">
          {email.status === 'failed'
            ? <XCircle className="w-4 h-4 text-destructive" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        </td>
      )}
    </tr>
  );
}

function EmailDetailDialog({ email, onClose, onMarkRead }) {
  if (!email) return null;
  const isInbox = email.from_email !== undefined && email.to !== undefined && email.received_at !== undefined;

  return (
    <Dialog open={!!email} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{email.subject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm border rounded-lg p-3 bg-muted/20">
          {email.from_email && (
            <div className="flex gap-2"><span className="text-muted-foreground w-14">Gönderen:</span><span>{email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}</span></div>
          )}
          {email.to && (
            <div className="flex gap-2"><span className="text-muted-foreground w-14">Alıcı:</span><span>{email.to}</span></div>
          )}
          {email.sent_by && (
            <div className="flex gap-2"><span className="text-muted-foreground w-14">Gönderen:</span><span>{email.sent_by}</span></div>
          )}
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14">Tarih:</span>
            <span>{format(new Date(email.received_at || email.created_date), 'dd MMM yyyy HH:mm')}</span>
          </div>
        </div>
        {email.body ? (
          <div className="border rounded-lg p-4 text-sm" dangerouslySetInnerHTML={{ __html: email.body }} />
        ) : (
          <p className="text-sm text-muted-foreground italic">İçerik yüklenmedi. Yenile butonuna basarak e-postaları çekin.</p>
        )}
        <div className="flex justify-between pt-2">
          {isInbox && !email.read && (
            <Button variant="outline" size="sm" onClick={() => onMarkRead(email)}>
              <Eye className="w-4 h-4 mr-2" />Okundu İşaretle
            </Button>
          )}
          <Button className="ml-auto" onClick={onClose}>Kapat</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EmailHistory() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const qc = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: () => base44.entities.EmailAccount.filter({ status: 'active' }),
  });

  const { data: sent = [], isLoading: loadingSent } = useQuery({
    queryKey: ['sent-emails'],
    queryFn: () => base44.entities.SentEmail.list('-created_date', 200),
  });

  const { data: inbox = [], isLoading: loadingInbox } = useQuery({
    queryKey: ['inbox-emails'],
    queryFn: () => base44.entities.InboxEmail.list('-received_at', 200),
  });

  const markReadMutation = useMutation({
    mutationFn: (email) => base44.entities.InboxEmail.update(email.id, { read: true }),
    onSuccess: () => qc.invalidateQueries(['inbox-emails']),
  });

  const handleFetchInbox = async () => {
    setFetching(true);
    await base44.functions.invoke('fetchInbox', { email_account_id: selectedAccountId || undefined });
    await qc.invalidateQueries(['inbox-emails']);
    setFetching(false);
  };

  const filterEmails = (list) => list.filter(e =>
    (e.subject || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.from_email || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.to || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.sent_by || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredSent = filterEmails(sent);
  const filteredInbox = filterEmails(inbox);
  const unreadCount = inbox.filter(e => !e.read).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">E-posta</h1>
          <p className="text-sm text-muted-foreground">Gelen ve giden e-postalar</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="inbox">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="w-4 h-4" />
              Gelen Kutusu
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs px-1.5 py-0 ml-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="w-4 h-4" />
              Gönderilen ({filteredSent.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {accounts.length > 1 && (
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Tüm hesaplar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Tüm hesaplar</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" onClick={handleFetchInbox} disabled={fetching} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
              {fetching ? 'Alınıyor...' : 'Yenile'}
            </Button>
          </div>
        </div>

        <TabsContent value="inbox" className="mt-3">
          {!accounts.some(a => a.imap_host) && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm mb-3">
              ⚠️ Gelen kutusu için IMAP ayarları gerekli. <strong>Ayarlar → E-posta Hesapları</strong> bölümünden IMAP sunucu bilgilerini ekleyin.
            </div>
          )}
          <Card>
            {loadingInbox ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Yükleniyor...</div>
            ) : filteredInbox.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Gelen kutusu boş. Yenile butonuna basın.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2 w-8"></th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Gönderen</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Konu</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInbox.map(e => <EmailRow key={e.id} email={e} onClick={setSelected} />)}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-3">
          <Card>
            {loadingSent ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Yükleniyor...</div>
            ) : filteredSent.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Send className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Henüz gönderilmiş e-posta yok.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2 w-8"></th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Alıcı</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Konu</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Tarih</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSent.map(e => <EmailRow key={e.id} email={e} onClick={setSelected} />)}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <EmailDetailDialog
        email={selected}
        onClose={() => setSelected(null)}
        onMarkRead={(email) => { markReadMutation.mutate(email); setSelected({ ...email, read: true }); }}
      />
    </div>
  );
}