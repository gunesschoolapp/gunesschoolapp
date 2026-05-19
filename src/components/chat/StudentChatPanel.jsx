import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentChatPanel({ studentRecord, user }) {
  const qc = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const bottomRef = useRef(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ['student_chat_rooms', studentRecord?.id],
    queryFn: () => base44.entities.TeamChatRoom.filter({ student_id: studentRecord.id }, '-last_message_at', 20),
    enabled: !!studentRecord?.id,
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Auto-select first room
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms]);

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['team_chat_messages', selectedRoomId],
    queryFn: () => base44.entities.TeamChatMessage.filter({ room_id: selectedRoomId }, 'sent_at', 100),
    enabled: !!selectedRoomId,
  });

  // Real-time
  useEffect(() => {
    if (!selectedRoomId) return;
    const unsub = base44.entities.TeamChatMessage.subscribe((event) => {
      if (event.data?.room_id === selectedRoomId) {
        refetchMessages();
      }
    });
    return unsub;
  }, [selectedRoomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const msg = await base44.entities.TeamChatMessage.create({
        room_id: selectedRoomId,
        sender_email: user?.email || studentRecord?.email || '',
        sender_name: studentRecord?.full_name || user?.full_name || 'Student',
        sender_type: 'student',
        content,
        sent_at: new Date().toISOString(),
        read_by: [user?.email || ''],
      });
      await base44.entities.TeamChatRoom.update(selectedRoomId, {
        last_message: content,
        last_message_at: new Date().toISOString(),
        last_sender_name: studentRecord?.full_name || 'Student',
      });
      return msg;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_chat_messages', selectedRoomId] });
      setMessageText('');
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || !selectedRoomId) return;
    sendMutation.mutate(messageText.trim());
  };

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center px-4">
        <MessageSquare className="w-12 h-12 opacity-20 mb-3" />
        <h3 className="font-semibold text-base mb-1">No messages yet</h3>
        <p className="text-sm">Your teacher or school staff will start a conversation with you here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: '65vh' }}>
      {/* Room tabs */}
      {rooms.length > 1 && (
        <div className="flex gap-2 pb-3 overflow-x-auto flex-shrink-0">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedRoomId === room.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              <Users className="w-3 h-3" />
              {room.name}
            </button>
          ))}
        </div>
      )}

      {/* Thread */}
      {selectedRoom && (
        <div className="flex flex-col flex-1 bg-card rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">{selectedRoom.name}</h3>
              <p className="text-xs text-muted-foreground">Chat with your school team</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No messages yet. Feel free to ask a question!
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_type === 'student';
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{msg.sender_name?.charAt(0)?.toUpperCase() || '?'}</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <p className="text-[11px] text-muted-foreground mb-1 px-1">{msg.sender_name}</p>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2.5 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border'}`}>
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
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                className="flex-1 min-h-[44px] max-h-[100px] text-sm resize-none"
                placeholder="Type a message..."
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
        </div>
      )}
    </div>
  );
}