import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageSquare, ExternalLink } from 'lucide-react';
import ChannelBadge from './ChannelBadge';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function MessageThread({ conversation, currentUser, onStudentClick }) {
  const [text, setText] = useState('');
  const [replyChannel, setReplyChannel] = useState(conversation?.channel || 'whatsapp');
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: () => base44.entities.Message.filter({ conversation_id: conversation.id }, 'sent_at', 100),
    enabled: !!conversation?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === conversation.id) {
        refetch();
        qc.invalidateQueries({ queryKey: ['conversations'] });
      }
    });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => {
    setReplyChannel(conversation?.channel || 'whatsapp');
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (msg) => base44.entities.Message.create(msg),
    onSuccess: async (newMsg) => {
      qc.invalidateQueries({ queryKey: ['messages', conversation.id] });
      await base44.entities.Conversation.update(conversation.id, {
        last_message: text,
        last_message_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setText('');
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    // WhatsApp kanalıysa wa.me ile aç
    if (replyChannel === 'whatsapp' && conversation.contact_identifier) {
      const phone = conversation.contact_identifier.replace(/[\s+\-()]/g, '');
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text.trim())}`;
      window.open(waUrl, '_blank');
    }
    sendMutation.mutate({
      conversation_id: conversation.id,
      sender_type: 'staff',
      sender_name: currentUser?.full_name || currentUser?.email || 'Staff',
      content: text.trim(),
      channel: replyChannel,
      sent_at: new Date().toISOString(),
      read: true,
    });
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a conversation to view messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
        <button onClick={onStudentClick} className="flex-1 text-left hover:opacity-75 transition">
          <h3 className="font-semibold text-foreground">{conversation.student_name || conversation.contact_identifier || 'Unknown'}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <ChannelBadge channel={conversation.channel} />
            {conversation.contact_identifier && (
              <span className="text-xs text-muted-foreground">{conversation.contact_identifier}</span>
            )}
          </div>
        </button>
        {/* WhatsApp quick-open */}
        {conversation.contact_identifier && (
          <a
            href={`https://wa.me/${conversation.contact_identifier.replace(/[\s+\-()]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp'ta Aç
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isStaff = msg.sender_type === 'staff';
          return (
            <div key={msg.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isStaff ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}>
                {!isStaff && (
                  <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name || 'Student'}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-1 ${isStaff ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {msg.sent_at ? format(new Date(msg.sent_at), 'HH:mm') : ''}
                  {isStaff && msg.channel && <span className="ml-2 opacity-70">via {msg.channel}</span>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply Box */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">Reply via:</span>
          <Select value={replyChannel} onValueChange={setReplyChannel}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Textarea
            className="flex-1 min-h-[60px] max-h-[120px] text-sm resize-none"
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
          />
          <Button onClick={handleSend} disabled={!text.trim() || sendMutation.isPending} className="self-end">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}