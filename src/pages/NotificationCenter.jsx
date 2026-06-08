import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, Send, Plus, Trash2, Check, X, Search,
  Users, BookOpen, Megaphone, Clock, Eye, MailOpen
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { NotificationService } from '@/lib/NotificationService';
import { useLanguage } from '@/lib/LanguageContext';

export default function NotificationCenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = user?.matched_role || user?.role;
  const isAdmin = ['admin', 'team_admin'].includes(role);
  const [activeTab, setActiveTab] = useState('inbox');
  const [showComposeDialog, setShowComposeDialog] = useState(false);

  // Data queries
  const { data: allNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date'),
    refetchInterval: 15000,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({}),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({}),
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.filter({}),
  });

  // Filter notifications by role
  const notifications = useMemo(() => {
    if (isAdmin) return allNotifications;
    return allNotifications.filter(n =>
      n.recipient_email === user?.email || n.sent_by === user?.full_name || n.created_by === user?.email
    );
  }, [allNotifications, user, isAdmin]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const sentCount = notifications.filter(n => n.sent_by === user?.full_name || n.created_by === user?.email).length;

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  // Notification type config
  const typeConfig = {
    lesson_reminder: { icon: '⏰', label: 'Lesson Reminder', color: 'bg-blue-100 text-blue-700' },
    new_resource: { icon: '📄', label: 'New Resource', color: 'bg-emerald-100 text-emerald-700' },
    payment: { icon: '💰', label: 'Payment', color: 'bg-green-100 text-green-700' },
    announcement: { icon: '📢', label: 'Announcement', color: 'bg-purple-100 text-purple-700' },
    custom: { icon: '✉️', label: 'Custom', color: 'bg-amber-100 text-amber-700' },
    payment_reminder: { icon: '💸', label: 'Payment Reminder', color: 'bg-red-100 text-red-700' },
    lesson_cancellation: { icon: '❌', label: 'Cancellation', color: 'bg-red-100 text-red-700' },
    message: { icon: '💬', label: 'Message', color: 'bg-slate-100 text-slate-700' },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bell className="w-7 h-7 text-primary" />
            {t('notificationCenterTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? 'Send and manage notifications for students & staff' : t('yourNotifications')}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <MailOpen className="w-4 h-4 mr-2" /> {t('markAllRead')}
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setShowComposeDialog(true)}>
              <Send className="w-4 h-4 mr-2" /> Send Notification
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Total</p>
            <p className="text-2xl font-bold mt-1">{notifications.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-blue-600 font-medium">Unread</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-emerald-600 font-medium">Read</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{notifications.length - unreadCount}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-purple-600 font-medium">Sent by Me</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{sentCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Bell className="w-4 h-4" /> {t('inbox')} {unreadCount > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{unreadCount}</Badge>}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="sent" className="gap-2">
              <Send className="w-4 h-4" /> Sent
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="inbox" className="mt-4 space-y-2">
          {notifications.filter(n => !n.read).length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-muted-foreground">{t('noNotifications')}</p>
            </div>
          ) : (
            notifications.filter(n => !n.read).map(notif => {
              const tc = typeConfig[notif.notification_type] || typeConfig.message;
              return (
                <div key={notif.id} className="bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                      {tc.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${tc.color} text-xs`}>{tc.label}</Badge>
                        {notif.sent_by && (
                          <span className="text-xs text-muted-foreground">from {notif.sent_by}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium">{notif.title || notif.notification_type}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{notif.message}</p>
                      {notif.image_url && (
                        <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-border">
                          <img src={notif.image_url} alt={notif.title} className="w-full max-h-48 object-cover cursor-zoom-in hover:opacity-95 transition-opacity" onClick={() => window.open(notif.image_url, '_blank')} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {notif.sent_at ? new Date(notif.sent_at).toLocaleString() : new Date(notif.created_date).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => markReadMutation.mutate(notif.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Mark as read">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(notif.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-destructive" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Read notifications */}
          {notifications.filter(n => n.read).length > 0 && (
            <>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pt-4 pb-1">{t('previouslyRead')}</h3>
              {notifications.filter(n => n.read).slice(0, 20).map(notif => {
                const tc = typeConfig[notif.notification_type] || typeConfig.message;
                return (
                  <div key={notif.id} className="bg-slate-50/50 border rounded-xl p-3 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{tc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{notif.message}</p>
                        <span className="text-xs text-muted-foreground">
                          {notif.sent_at ? new Date(notif.sent_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <button onClick={() => deleteMutation.mutate(notif.id)} className="p-1 text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-2">
          {notifications.filter(n => n.sent_by === user?.full_name).length === 0 ? (
            <div className="text-center py-12">
              <Send className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-muted-foreground">No sent notifications</p>
            </div>
          ) : (
            notifications.filter(n => n.sent_by === user?.full_name).map(notif => {
              const tc = typeConfig[notif.notification_type] || typeConfig.message;
              return (
                <div key={notif.id} className="bg-white border rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{tc.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                      {notif.image_url && (
                        <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-border">
                          <img src={notif.image_url} alt={notif.title} className="w-full max-h-48 object-cover cursor-zoom-in hover:opacity-95 transition-opacity" onClick={() => window.open(notif.image_url, '_blank')} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>To: {notif.recipient_email}</span>
                        <span>•</span>
                        <span>{notif.read ? '✓ Read' : '○ Unread'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Compose Notification Dialog */}
      <ComposeNotificationDialog
        open={showComposeDialog}
        onClose={() => setShowComposeDialog(false)}
        courses={courses}
        students={students}
        staffList={staffList}
        user={user}
        onSent={() => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          setShowComposeDialog(false);
        }}
      />
    </div>
  );
}

// ─── Compose Dialog ─────────────────────────────────────
function ComposeNotificationDialog({ open, onClose, courses, students, staffList = [], user, onSent }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [icon, setIcon] = useState('📢');
  const [targetMode, setTargetMode] = useState('all'); // all | courses | students | staff | both
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isPopup, setIsPopup] = useState(false);
  const [sending, setSending] = useState(false);

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredStaff = staffList.filter(s =>
    s.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const toggleCourse = (id) => setSelectedCourses(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const toggleStudent = (id) => setSelectedStudents(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const toggleStaff = (id) => setSelectedStaff(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);

  const getRecipientEmails = () => {
    const emails = new Set();
    if (targetMode === 'all') {
      students.forEach(s => { if (s.email) emails.add(s.email); });
    }
    if (targetMode === 'courses' || targetMode === 'both') {
      selectedCourses.forEach(cid => {
        const course = courses.find(c => c.id === cid);
        course?.enrolled_students?.forEach(sid => {
          const s = students.find(st => st.id === sid);
          if (s?.email) emails.add(s.email);
        });
      });
    }
    if (targetMode === 'students' || targetMode === 'both') {
      selectedStudents.forEach(sid => {
        const s = students.find(st => st.id === sid);
        if (s?.email) emails.add(s.email);
      });
    }
    if (targetMode === 'staff') {
      if (selectedStaff.length === 0) {
        staffList.forEach(s => { if (s.email) emails.add(s.email); });
      } else {
        selectedStaff.forEach(sid => {
          const s = staffList.find(st => st.id === sid);
          if (s?.email) emails.add(s.email);
        });
      }
    }
    return [...emails];
  };

  const handleSend = async () => {
    if (!title || !message) return;
    const emails = getRecipientEmails();
    if (emails.length === 0) return alert('No recipients selected!');

    setSending(true);
    try {
      let uploadedUrl = '';
      if (imageFile) {
        const uploadRes = await base44.integrations.Core.UploadFile({ file: imageFile });
        uploadedUrl = uploadRes.file_url || '';
      }

      await NotificationService.sendCustom({
        title,
        message,
        icon,
        recipientEmails: emails,
        sentBy: user?.full_name || 'Admin',
        image_url: uploadedUrl,
        is_popup: isPopup,
      });
      alert(`✅ Notification sent to ${emails.length} recipient(s)!`);
      setTitle(''); setMessage(''); setSelectedCourses([]); setSelectedStudents([]); setSelectedStaff([]); setImageFile(null); setIsPopup(false);
      onSent();
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSending(false);
  };

  const recipientCount = getRecipientEmails().length;

  const ICONS = ['📢', '⚠️', '🎉', '📚', '💰', '🔔', '⏰', '🎓', '✅', '❌'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Send Notification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Icon + Title */}
          <div className="flex gap-3">
            <div>
              <Label className="text-xs">Icon</Label>
              <div className="flex gap-1 mt-1 flex-wrap max-w-[160px]">
                {ICONS.map(i => (
                  <button key={i} onClick={() => setIcon(i)} className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center ${icon === i ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-slate-100'}`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Title *</Label>
              <Input className="mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Important Announcement" />
            </div>
          </div>

          {/* Message */}
          <div>
            <Label className="text-xs">Message *</Label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your notification message..." />
          </div>

          {/* Image + Popup Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-xl p-4 bg-slate-50">
            <div>
              <Label className="text-xs font-semibold">Resim Ekle (Yerel Dosya)</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1 cursor-pointer text-xs bg-white"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) setImageFile(file);
                }}
              />
              {imageFile && (
                <div className="mt-2 flex items-center justify-between bg-white border px-2 py-1 rounded-md">
                  <span className="text-xs truncate max-w-[180px] font-medium">{imageFile.name}</span>
                  <button type="button" onClick={() => setImageFile(null)} className="text-[10px] text-destructive hover:underline font-bold">Kaldır</button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 md:pt-6">
              <input
                type="checkbox"
                id="popup_tick"
                className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary cursor-pointer"
                checked={isPopup}
                onChange={e => setIsPopup(e.target.checked)}
              />
              <Label htmlFor="popup_tick" className="text-xs font-semibold cursor-pointer select-none">
                Pop-up Duyuru Olarak Göster (Uygulama açılışında ekranı kaplar)
              </Label>
            </div>
          </div>

          {/* Target Selection */}
          <div className="border rounded-xl p-4 bg-slate-50">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recipients</Label>
            <div className="grid grid-cols-5 gap-1.5 mt-3 mb-4">
              {[
                { v: 'all', l: '🌐 Students' },
                { v: 'courses', l: '📚 Course' },
                { v: 'students', l: '👤 Student' },
                { v: 'staff', l: '👥 Staff' },
                { v: 'both', l: '📚+👤 Both' },
              ].map(m => (
                <button key={m.v} onClick={() => setTargetMode(m.v)} className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${targetMode === m.v ? 'bg-primary text-white border-primary' : 'bg-white border-border hover:border-primary/50'}`}>
                  {m.l}
                </button>
              ))}
            </div>

            {/* Course Selection */}
            {(targetMode === 'courses' || targetMode === 'both') && (
              <div className="mb-4">
                <Label className="text-xs mb-2 block">Select Courses</Label>
                <div className="grid grid-cols-2 gap-2">
                  {courses.map(c => (
                    <button key={c.id} onClick={() => toggleCourse(c.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-all ${selectedCourses.includes(c.id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-border hover:border-blue-200'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCourses.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {selectedCourses.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate font-medium">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Student Selection */}
            {(targetMode === 'students' || targetMode === 'both') && (
              <div className="mb-4">
                <Label className="text-xs mb-2 block">Select Students</Label>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                  <input className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students..." />
                </div>
                {selectedStudents.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedStudents.map(sid => {
                      const s = students.find(st => st.id === sid);
                      return (
                        <span key={sid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                          {s?.full_name || sid}
                          <button onClick={() => toggleStudent(sid)}><X className="w-3 h-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-32 overflow-y-auto border rounded-lg bg-white">
                  {filteredStudents.map(s => (
                    <button key={s.id} onClick={() => toggleStudent(s.id)} className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-slate-50 border-b last:border-0 ${selectedStudents.includes(s.id) ? 'bg-emerald-50' : ''}`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedStudents.includes(s.id) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                        {selectedStudents.includes(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="font-medium">{s.full_name}</span>
                      <span className="text-muted-foreground ml-auto">{s.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Staff Selection */}
            {targetMode === 'staff' && (
              <div>
                <Label className="text-xs mb-2 block">Select Teachers & Staff (None selects all)</Label>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                  <input className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs" value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search staff/teachers..." />
                </div>
                {selectedStaff.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedStaff.map(sid => {
                      const s = staffList.find(st => st.id === sid);
                      return (
                        <span key={sid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {s?.full_name || sid}
                          <button onClick={() => toggleStaff(sid)}><X className="w-3 h-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-32 overflow-y-auto border rounded-lg bg-white">
                  {filteredStaff.map(s => (
                    <button key={s.id} onClick={() => toggleStaff(s.id)} className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-slate-50 border-b last:border-0 ${selectedStaff.includes(s.id) ? 'bg-blue-50' : ''}`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedStaff.includes(s.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {selectedStaff.includes(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="font-medium">{s.full_name}</span>
                      <span className="text-muted-foreground ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold uppercase">{s.role}</span>
                      <span className="text-muted-foreground text-xs ml-2">{s.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{recipientCount} recipient(s) selected</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !title || !message || recipientCount === 0}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : `Send to ${recipientCount} recipient(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}