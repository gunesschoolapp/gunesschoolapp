import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Send, Paperclip, MessageSquare } from 'lucide-react';
import { format, isToday } from 'date-fns';

export default function StudentChat() {
  const { student } = useOutletContext();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const [textVal, setTextVal] = useState('');

  // Get or create the student's conversation
  useEffect(() => {
    if (!student?.id) return;
    base44.entities.Conversation.filter({ student_id: student.id, channel: 'other' })
      .then(convs => {
        if (convs.length > 0) {
          setConversation(convs[0]);
        } else {
          return base44.entities.Conversation.create({
            student_id: student.id,
            student_name: student.full_name || student.email,
            channel: 'other',
            contact_identifier: student.email,
            status: 'open',
            unread_count: 0,
          }).then(conv => setConversation(conv));
        }
      }).finally(() => setLoading(false));
  }, [student?.id]);

  // Load messages
  useEffect(() => {
    if (!conversation?.id) return;
    base44.entities.Message.filter({ conversation_id: conversation.id }, 'sent_at', 200)
      .then(setMessages);

    // Real-time subscription
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === conversation.id) {
        if (event.type === 'create') {
          setMessages(prev => {
            if (prev.find(m => m.id === event.id)) return prev;
            return [...prev, event.data];
          });
        }
      }
    });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!textVal.trim() || !conversation || sending) return;
    const content = textVal.trim();
    setTextVal('');
    setSending(true);

    const optimistic = {
      id: 'temp-' + Date.now(),
      conversation_id: conversation.id,
      sender_type: 'student',
      sender_name: student.full_name || student.email,
      content,
      channel: 'other',
      sent_at: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const msg = await base44.entities.Message.create(optimistic);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? msg : m));
      // Update conversation
      await base44.entities.Conversation.update(conversation.id, {
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
      });
      setConversation(prev => ({ ...prev, unread_count: (prev.unread_count || 0) + 1 }));
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setTextVal(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isToday(d) ? format(d, 'HH:mm') : format(d, 'dd MMM HH:mm');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen">
      {/* Header */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">G</span>
        </div>
        <div>
          <p className="font-semibold text-sm">Güneş English School</p>
          <p className="text-xs text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Çevrimiçi
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          background: 'repeating-linear-gradient(45deg, hsl(var(--muted)/0.3) 0px, hsl(var(--muted)/0.3) 1px, transparent 1px, transparent 20px)',
        }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Henüz mesaj yok</p>
            <p className="text-xs mt-1">Okulla iletişime geçmek için mesaj gönderin</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isStudent = msg.sender_type === 'student';
          const prevMsg = messages[i - 1];
          const showDate = !prevMsg || format(new Date(msg.sent_at || msg.created_date), 'dd/MM/yyyy') !== format(new Date(prevMsg.sent_at || prevMsg.created_date), 'dd/MM/yyyy');

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-2">
                  <span className="bg-card border border-border text-xs text-muted-foreground px-3 py-1 rounded-full">
                    {isToday(new Date(msg.sent_at || msg.created_date)) ? 'Bugün' : format(new Date(msg.sent_at || msg.created_date), 'dd MMM yyyy')}
                  </span>
                </div>
              )}
              <div className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                {!isStudent && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
                    <span className="text-primary text-xs font-bold">G</span>
                  </div>
                )}
                <div className={`max-w-[75%] ${isStudent ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`
                    rounded-2xl px-3.5 py-2.5 shadow-sm
                    ${isStudent
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                    }
                    ${msg.id?.startsWith('temp-') ? 'opacity-70' : ''}
                  `}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  <span className={`text-xs mt-1 text-muted-foreground ${isStudent ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.sent_at || msg.created_date)}
                    {isStudent && msg.id?.startsWith('temp-') && ' · Gönderiliyor...'}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-card border-t border-border">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-background border border-border rounded-2xl px-4 py-2.5 flex items-end gap-2">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent text-sm resize-none outline-none max-h-32 min-h-[20px]"
              placeholder="Mesajınızı yazın..."
              rows={1}
              value={textVal}
              onChange={e => {
                setTextVal(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!textVal.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}