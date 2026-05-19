import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send, Volume2, VolumeX, Bot, Loader2 } from 'lucide-react';


export default function AITeacherChat({ student }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Init conversation
  useEffect(() => {
    async function init() {
      try {
        const convos = await base44.agents.listConversations({ agent_name: 'ai_teacher' });
        let conv = convos?.[0];
        if (!conv) {
          conv = await base44.agents.createConversation({
            agent_name: 'ai_teacher',
            metadata: { name: `${student?.full_name || 'Student'} - AI Teacher` }
          });
        }
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [conversation?.id]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // TTS - speak AI response
  const speak = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const plainText = text.replace(/[#*`_~]/g, '');
    const utter = new SpeechSynthesisUtterance(plainText);
    utter.lang = 'en-GB';
    utter.rate = 0.95;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // Send message
  const sendMessage = async (text) => {
    if (!text.trim() || !conversation || sending) return;
    setSending(true);
    try {
      const updated = await base44.agents.addMessage(conversation, { role: 'user', content: text.trim() });
      setMessages(updated.messages || []);
      setInput('');
      // Find last AI message and speak it
      const aiMsgs = (updated.messages || []).filter(m => m.role === 'assistant');
      if (aiMsgs.length > 0) {
        speak(aiMsgs[aiMsgs.length - 1].content);
      }
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  // STT
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Your browser does not support voice input.');

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const displayMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  return (
    <div className="flex flex-col h-[520px] bg-card rounded-2xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Luna - AI English Teacher</p>
          <p className="text-xs text-white/70">Always ready to help you practice!</p>
        </div>
        <button
          onClick={() => { ttsEnabled ? stopSpeaking() : null; setTtsEnabled(!ttsEnabled); }}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          title={ttsEnabled ? 'Sesi kapat' : 'Sesi aç'}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayMessages.length === 0 && (
          <div className="text-center py-10">
            <Bot className="w-12 h-12 text-primary/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Hello! I'm Luna 👋</p>
            <p className="text-xs text-muted-foreground mt-1">Ask me anything in English or Turkish!</p>
          </div>
        )}
        {displayMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-white rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 py-3 border-t bg-background">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title="Sesli konuş"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder="Type or speak in English..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            disabled={sending}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {isListening && (
          <p className="text-xs text-center text-red-500 mt-1.5 animate-pulse">🎤 Listening... speak now</p>
        )}
      </div>
    </div>
  );
}