import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X, Plus, Send, MessageSquare, Users, User, ChevronLeft,
  Search, Hash, UserCircle
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

function timeLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM');
}

function RoomIcon({ type }) {
  if (type === 'student') return <UserCircle className="w-4 h-4 text-primary" />;
  if (type === 'task') return <Hash className="w-4 h-4 text-amber-500" />;
  return <Users className="w-4 h-4 text-emerald-500" />;
}

export default function TeamChatSidebar({ open, onClose, user }) {
  const qc = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('general');
  const [newStudentSearch, setNewStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const bottomRef = useRef(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ['team_chat_rooms'],
    queryFn: () => base44.entities.TeamChatRoom.list('-last_message_at', 50),
    enabled: open,
    refetchInterval: 10000,
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['team_chat_messages', selectedRoomId],
    queryFn: () => base44.entities.TeamChatMessage.filter({ room_id: selectedRoomId }, 'sent_at', 100),
    enabled: !!selectedRoomId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!selectedRoomId) return;
    const unsub = base44.entities.TeamChatMessage.subscribe((event) => {
      if (event.data?.room_id === selectedRoomId) {
        refetchMessages();
        qc.invalidateQueries({ queryKey: ['team_chat_rooms'] });
      }
    });
    return unsub;
  }, [selectedRoomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search students for new room
  useEffect(() => {
    if (newRoomType !== 'student' || newStudentSearch.length < 2) {
      setStudentResults([]);
      return;
    }
    base44.entities.Student.list('-created_date', 100)
      .then(all => setStudentResults(
        all.filter(s => s.full_name?.toLowerCase().includes(newStudentSearch.toLowerCase())).slice(0, 5)
      ));
  }, [newStudentSearch, newRoomType]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const msg = await base44.entities.TeamChatMessage.create({
        room_id: selectedRoomId,
        sender_email: user?.email || '',
        sender_name: user?.full_name || user?.email || 'Staff',
        sender_type: 'staff',
        content,
        sent_at: new Date().toISOString(),
        read_by: [user?.email || ''],
      });
      await base44.entities.TeamChatRoom.update(selectedRoomId, {
        last_message: content,
        last_message_at: new Date().toISOString(),
        last_sender_name: user?.full_name || user?.email || 'Staff',
      });
      return msg;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_chat_messages', selectedRoomId] });
      qc.invalidateQueries({ queryKey: ['team_chat_rooms'] });
      setMessageText('');
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      const name = newRoomType === 'student' && selectedStudent
        ? `${selectedStudent.full_name}`
        : newRoomName.trim();
      const room = await base44.entities.TeamChatRoom.create({
        name,
        type: newRoomType,
        student_id: selectedStudent?.id || undefined,
        student_name: selectedStudent?.full_name || undefined,
        participants: [user?.email || ''],
      });
      return room;
    },
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ['team_chat_rooms'] });
      setCreating(false);
      setNewRoomName('');
      setNewStudentSearch('');
      setSelectedStudent(null);
      setNewRoomType('general');
      setSelectedRoomId(room.id);
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || !selectedRoomId) return;
    sendMutation.mutate(messageText.trim());
  };

  const filteredRooms = rooms.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl flex shadow-2xl">
        {/* Room List */}
        <div className={`w-64 bg-card border-r border-border flex flex-col flex-shrink-0 ${selectedRoomId ? 'hidden sm:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm">Team Chat</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCreating(true)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search rooms..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Create Room Form */}
          {creating && (
            <div className="p-3 border-b border-border bg-muted/30 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">New Room</p>
              <div className="flex gap-1">
                {['general', 'student', 'task'].map(t => (
                  <button
                    key={t}
                    onClick={() => setNewRoomType(t)}
                    className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${newRoomType === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {newRoomType === 'student' ? (
                <div>
                  <Input
                    className="h-7 text-xs"
                    placeholder="Search student..."
                    value={newStudentSearch}
                    onChange={e => setNewStudentSearch(e.target.value)}
                  />
                  {studentResults.length > 0 && (
                    <div className="mt-1 bg-card border border-border rounded-md shadow-sm overflow-hidden">
                      {studentResults.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setSelectedStudent(s); setNewStudentSearch(s.full_name); setStudentResults([]); }}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                        >
                          {s.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Input className="h-7 text-xs" placeholder="Room name..." value={newRoomName} onChange={e => setNewRoomName(e.target.value)} />
              )}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => createRoomMutation.mutate()}
                  disabled={createRoomMutation.isPending || (newRoomType === 'student' ? !selectedStudent : !newRoomName.trim())}
                >
                  Create
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setCreating(false); setNewRoomName(''); setSelectedStudent(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Room List */}
          <div className="flex-1 overflow-y-auto">
            {filteredRooms.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No rooms yet. Create one with +
              </div>
            ) : filteredRooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`w-full text-left px-3 py-3 border-b border-border hover:bg-muted/50 transition-colors ${selectedRoomId === room.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">
                    <RoomIcon type={room.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">{room.name}</span>
                      {room.last_message_at && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeLabel(room.last_message_at)}</span>
                      )}
                    </div>
                    {room.last_message && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {room.last_sender_name ? `${room.last_sender_name}: ` : ''}{room.last_message}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className={`flex-1 flex flex-col bg-background min-w-0 ${selectedRoomId ? 'flex' : 'hidden sm:flex'}`}>
          {!selectedRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <button className="absolute top-4 right-4 sm:hidden" onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
              <MessageSquare className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-sm font-medium">Select a room to start chatting</p>
              <p className="text-xs text-muted-foreground mt-1">Or create a new room with the + button</p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3">
                <Button size="icon" variant="ghost" className="sm:hidden h-7 w-7" onClick={() => setSelectedRoomId(null)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <RoomIcon type={selectedRoom.type} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{selectedRoom.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{selectedRoom.type} room</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    No messages yet. Say hello! 👋
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.sender_email === user?.email;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-[10px] font-bold text-primary">{msg.sender_name?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isMe && (
                          <p className="text-[11px] text-muted-foreground mb-1 px-1">
                            {msg.sender_name} {msg.sender_type === 'student' && <span className="text-primary">(Student)</span>}
                          </p>
                        )}
                        <div className={`rounded-2xl px-3 py-2 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 px-1">
                          {msg.sent_at ? format(new Date(msg.sent_at), 'HH:mm') : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Textarea
                    className="flex-1 min-h-[44px] max-h-[120px] text-sm resize-none"
                    placeholder="Type a message... (Enter to send)"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMutation.isPending}
                    className="self-end"
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}