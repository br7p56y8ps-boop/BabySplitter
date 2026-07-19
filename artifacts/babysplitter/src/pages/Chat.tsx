import { useState, useEffect, useRef } from 'react';
import { AppBar } from '@/components/AppBar';
import { BottomNav } from '@/components/BottomNav';
import { useChatMessages } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Chat() {
  const { identity } = useAuth();
  const { data: messages } = useChatMessages();
  const { sendChatMessage } = useMutations();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendChatMessage.mutate({ member_name: identity!, message: text.trim() }, {
      onSuccess: () => setText("")
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col max-w-md mx-auto relative pt-20 pb-36">
      <AppBar title="Chat" showRefresh={false} />
      
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 hide-scrollbar">
        {messages?.map((msg, idx) => {
          const isMe = msg.member_name === identity;
          const showName = idx === 0 || messages[idx - 1].member_name !== msg.member_name;
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
            >
              {showName && !isMe && <span className="text-[10px] font-bold text-muted-foreground ml-1 mb-1">{msg.member_name}</span>}
              <div className={`p-3 rounded-2xl ${isMe ? 'bg-primary/90 text-white rounded-tr-sm backdrop-blur-md shadow-sm border border-primary-foreground/20' : 'glass-panel rounded-tl-sm'}`}>
                <p className="text-sm leading-relaxed">{msg.message}</p>
              </div>
              <span className="text-[9px] text-muted-foreground/60 mt-1 mx-1">{format(new Date(msg.created_at), 'HH:mm')}</span>
            </motion.div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-[88px] left-0 right-0 z-30 flex justify-center px-4 pb-2 pt-4 bg-gradient-to-t from-background via-background/90 to-transparent">
        <div className="w-full max-w-md flex items-center gap-2 glass-panel-heavy p-2 rounded-[1.5rem] shadow-lg shadow-black/5 dark:shadow-black/20">
          <input 
            type="text" 
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Message the group..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!text.trim() || sendChatMessage.isPending}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 shrink-0 shadow-md shadow-primary/20"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
