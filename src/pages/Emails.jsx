import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Menu, X, Trash2, Archive, Mail, CheckSquare } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import EmailSidebar from '@/components/emails/EmailSidebar';
import EmailList from '@/components/emails/EmailList';
import EmailDetail from '@/components/emails/EmailDetail';
import ComposeEmail from '@/components/emails/ComposeEmail';
import { useToast } from '@/components/ui/use-toast';

export default function Emails() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState(null); // null | { type: 'reply'|'forward', email }
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [bulkSelected, setBulkSelected] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setCurrentUser); }, []);

  const { data: accounts = [] } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: () => base44.entities.EmailAccount.filter({ status: 'active' }),
  });

  const { data: inboxEmails = [], refetch: refetchInbox, isFetching: inboxFetching } = useQuery({
    queryKey: ['inbox-emails'],
    queryFn: () => base44.entities.InboxEmail.list('-received_at', 500),
    refetchInterval: 60000,
  });

  const { data: sentEmails = [], refetch: refetchSent } = useQuery({
    queryKey: ['sent-emails'],
    queryFn: () => base44.entities.SentEmail.list('-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InboxEmail.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox-emails'] }),
    onError: () => queryClient.invalidateQueries({ queryKey: ['inbox-emails'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InboxEmail.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-emails'] });
      setSelectedEmail(null);
    },
  });

  const visibleInbox = inboxEmails.filter(email => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') return true;
    return email.visible_to_roles?.includes(currentUser.role) || email.visible_to_users?.includes(currentUser.email);
  }).filter(email => !selectedAccountId || email.account_id === selectedAccountId);

  const visibleSent = sentEmails.filter(e => !selectedAccountId || e.account_id === selectedAccountId);

  const folders = [
    {
      id: 'inbox', label: 'Gelen Kutusu',
      emails: visibleInbox.filter(e => !e.archived && !e.spam && !e.trash),
      count: visibleInbox.filter(e => !e.archived && !e.spam && !e.trash && !e.read).length
    },
    { id: 'starred', label: 'Yıldızlı', emails: visibleInbox.filter(e => e.starred && !e.trash), count: 0 },
    { id: 'sent', label: 'Gönderilenler', emails: visibleSent, count: 0 },
    { id: 'drafts', label: 'Taslaklar', emails: visibleSent.filter(e => e.status === 'draft'), count: 0 },
    { id: 'archived', label: 'Arşiv', emails: visibleInbox.filter(e => e.archived && !e.trash), count: 0 },
    { id: 'spam', label: 'Spam', emails: visibleInbox.filter(e => e.spam && !e.trash), count: visibleInbox.filter(e => e.spam && !e.trash && !e.read).length },
    { id: 'trash', label: 'Çöp Kutusu', emails: visibleInbox.filter(e => e.trash), count: 0 },
  ];

  const activeF = folders.find(f => f.id === activeFolder);
  const isSentFolder = ['sent', 'drafts'].includes(activeFolder);
  const searchLower = search.toLowerCase();
  const currentEmails = (activeF?.emails || []).filter(e =>
    !search ||
    e.subject?.toLowerCase().includes(searchLower) ||
    (e.from_email || e.to)?.toLowerCase().includes(searchLower) ||
    (e.from_name || '')?.toLowerCase().includes(searchLower) ||
    e.snippet?.toLowerCase().includes(searchLower)
  );

  // Actions
  const handleSelect = (email) => {
    if (!isSentFolder && !email.read) {
      updateMutation.mutate({ id: email.id, data: { read: true } });
    }
    setSelectedEmail(email);
  };

  const handleStar = (email) => updateMutation.mutate({ id: email.id, data: { starred: !email.starred } });
  const handleArchive = (email) => { updateMutation.mutate({ id: email.id, data: { archived: !email.archived } }); setSelectedEmail(null); };
  const handleDelete = (email) => { updateMutation.mutate({ id: email.id, data: { trash: true } }); setSelectedEmail(null); };
  const handleSpam = (email) => { updateMutation.mutate({ id: email.id, data: { spam: true } }); setSelectedEmail(null); };
  const handleRestore = (email) => { updateMutation.mutate({ id: email.id, data: { trash: false, spam: false } }); setSelectedEmail(null); };
  const handleReply = (email) => { setComposeMode({ type: 'reply', email }); setShowCompose(true); };
  const handleForward = (email) => { setComposeMode({ type: 'forward', email }); setShowCompose(true); };

  const handleFolderChange = (id) => { setActiveFolder(id); setSelectedEmail(null); setShowSidebar(false); setSearch(''); setBulkSelected([]); };

  const handleToggleSelect = (id) => {
    setBulkSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (activeFolder === 'trash') {
      // Gerçekten sil
      bulkSelected.forEach(id => deleteMutation.mutate(id));
    } else {
      // Çöp kutusuna taşı
      bulkSelected.forEach(id => updateMutation.mutate({ id, data: { trash: true } }));
    }
    setBulkSelected([]);
  };
  const handleBulkArchive = () => {
    bulkSelected.forEach(id => updateMutation.mutate({ id, data: { archived: true } }));
    setBulkSelected([]);
  };
  const handleBulkRead = () => {
    bulkSelected.forEach(id => updateMutation.mutate({ id, data: { read: true } }));
    setBulkSelected([]);
  };

  const handleRefetch = async () => {
    // Try to sync from IMAP
    try {
      await base44.functions.invoke('fetchInbox', { email_account_id: selectedAccountId || null });
    } catch (e) { /* ignore */ }
    refetchInbox();
    refetchSent();
  };

  const defaultAccount = accounts.find(a => a.id === selectedAccountId) || accounts.find(a => a.is_default) || accounts[0];

  return (
    <ProtectedRoute requiredPermission="canViewEmails">
      <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden">

        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-60 xl:w-64 border-r bg-background flex-shrink-0 overflow-y-auto">
          <EmailSidebar
            folders={folders}
            activeFolder={activeFolder}
            onFolderChange={handleFolderChange}
            onCompose={() => { setComposeMode(null); setShowCompose(true); }}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
          />
        </aside>

        {/* Sidebar - Mobile Overlay */}
        {showSidebar && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
            <div className="relative w-64 bg-background h-full shadow-2xl overflow-y-auto">
              <EmailSidebar
                folders={folders}
                activeFolder={activeFolder}
                onFolderChange={handleFolderChange}
                onCompose={() => { setComposeMode(null); setShowCompose(true); setShowSidebar(false); }}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onAccountChange={setSelectedAccountId}
                onClose={() => setShowSidebar(false)}
              />
            </div>
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Top Bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-background flex-shrink-0">
            <button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-muted rounded-full lg:hidden flex-shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="E-postalarda ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-0 rounded-full h-10"
              />
            </div>
            <button
              onClick={handleRefetch}
              className={`p-2 hover:bg-muted rounded-full flex-shrink-0 ${inboxFetching ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Bulk Action Bar */}
          {bulkSelected.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b flex-shrink-0">
              <span className="text-sm font-medium text-primary">{bulkSelected.length} seçili</span>
              <div className="flex-1" />
              <button onClick={handleBulkRead} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-card border rounded-lg hover:bg-muted">
                <Mail className="w-3.5 h-3.5" /> Okundu
              </button>
              <button onClick={handleBulkArchive} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-card border rounded-lg hover:bg-muted">
                <Archive className="w-3.5 h-3.5" /> Arşivle
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-destructive/10 text-destructive border rounded-lg hover:bg-destructive/20">
                <Trash2 className="w-3.5 h-3.5" /> Sil
              </button>
              <button onClick={() => setBulkSelected([])} className="p-1.5 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* List / Detail */}
          <div className="flex-1 overflow-hidden flex">
            {/* Email List */}
            <div className={`flex flex-col overflow-y-auto ${selectedEmail ? 'hidden lg:flex lg:w-2/5 xl:w-1/3 border-r' : 'flex-1'}`}>
              {/* Folder Title */}
              <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
                <h2 className="font-semibold text-sm">{activeF?.label}</h2>
                <span className="text-xs text-muted-foreground">{currentEmails.length} e-posta</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <EmailList
                  emails={currentEmails}
                  isSentFolder={isSentFolder}
                  onSelect={handleSelect}
                  onStar={handleStar}
                  selected={bulkSelected}
                  onToggleSelect={handleToggleSelect}
                  bulkMode={bulkSelected.length > 0}
                  onBulkSelectAll={setBulkSelected}
                  onSetSelected={setBulkSelected}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                />
              </div>
            </div>

            {/* Email Detail */}
            {selectedEmail && (
              <div className="flex-1 overflow-hidden">
                <EmailDetail
                  email={selectedEmail}
                  isSentFolder={isSentFolder}
                  onBack={() => setSelectedEmail(null)}
                  onStar={handleStar}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onSpam={handleSpam}
                  onRestore={handleRestore}
                  onReply={handleReply}
                  onForward={handleForward}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose */}
      {showCompose && (
        <ComposeEmail
          onClose={() => { setShowCompose(false); setComposeMode(null); }}
          replyTo={composeMode?.type === 'reply' ? composeMode.email : null}
          forwardOf={composeMode?.type === 'forward' ? composeMode.email : null}
          defaultAccount={defaultAccount}
        />
      )}

      {/* Mobile FAB */}
      {!showCompose && (
        <button
          onClick={() => { setComposeMode(null); setShowCompose(true); }}
          className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 z-40 lg:hidden"
        >
          <Mail className="w-6 h-6" />
        </button>
      )}
    </ProtectedRoute>
  );
}