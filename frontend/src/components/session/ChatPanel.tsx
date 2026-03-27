'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, User, MessageSquare, Code } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';

export const ChatPanel = ({ socket, sessionId }: { socket: Socket | null, sessionId: string }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    // Initial fetch from REST API
    const fetchHistory = async () => {
      try {
        const { data: { session: authSession } } = await (await import('@/lib/supabase/client')).createClient().auth.getSession();
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sessions/${sessionId}/messages`, {
          headers: {
            'Authorization': `Bearer ${authSession?.access_token}`
          }
        });
        const data = await res.json();
        if (data.messages) setMessages(data.messages);
      } catch (err) {
        console.error('Fetch chat history error:', err);
      }
    };

    fetchHistory();
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new-message', (message: any) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('new-message');
    };
  }, [socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    socket.emit('send-message', input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full glass rounded-2xl overflow-hidden border border-white/10">
      <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-accent" />
        </div>
        <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Live Chat</span>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        {messages.map((msg, i) => {
          const isMe = msg.user_id === user?.id;
          return (
            <div 
              key={msg.id || i}
              className={cn(
                "flex flex-col max-w-[85%] animate-in slide-in-from-bottom-2 duration-300",
                isMe ? "ml-auto items-end" : "items-start"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wide">
                  {isMe ? 'You' : (msg.profiles?.display_name || 'System')}
                </span>
                <span className="text-[10px] text-white/10">
                  {format(new Date(msg.created_at || Date.now()), 'h:mm a')}
                </span>
              </div>
              <div className={cn(
                "px-3 py-2 rounded-xl text-sm",
                isMe ? "bg-primary text-white rounded-tr-none" : "bg-white/5 text-white/80 border border-white/10 rounded-tl-none"
              )}>
                {msg.content.includes('```') ? (
                  <pre className="p-2 bg-black/40 rounded-lg font-mono text-xs overflow-x-auto my-1 border border-white/5">
                    {msg.content.replace(/```/g, '')}
                  </pre>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/10">
        <div className="relative group">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input-field w-full pr-12 py-3 bg-white/5 border-white/10 group-focus-within:border-primary/50 transition-all"
          />
          <button 
            type="button"
            onClick={() => setInput(prev => `\`\`\`\n${prev}\n\`\`\``)}
            className="absolute right-12 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 text-white/20 hover:text-white transition-all rounded-lg"
            title="Wrap as code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-all active:scale-90 shadow-lg shadow-primary/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
