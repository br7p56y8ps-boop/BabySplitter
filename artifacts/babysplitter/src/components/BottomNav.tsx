import { Link, useLocation } from "wouter";
import { House, Banknote, MessagesSquare, BookOpen, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useChatMessages } from "@/hooks/useQueries";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const [location] = useLocation();
  const { identity } = useAuth();
  const { data: messages } = useChatMessages();

  const [lastReadAt, setLastReadAt] = useState<string | null>(null);

  useEffect(() => {
    if (identity) {
      setLastReadAt(localStorage.getItem(`chat_last_read_${identity}`));
    }
  }, [identity]);

  useEffect(() => {
    if (location === '/chat' && identity) {
      const now = new Date().toISOString();
      localStorage.setItem(`chat_last_read_${identity}`, now);
      setLastReadAt(now);
    }
  }, [location, identity]);

  const unreadCount = useMemo(() => {
    if (!messages || !identity) return 0;
    return messages.filter(
      m => m.member_name !== identity &&
        (!lastReadAt || new Date(m.created_at) > new Date(lastReadAt))
    ).length;
  }, [messages, identity, lastReadAt]);

  const navItems = [
    { path: "/home",       icon: House,             label: "Home"    },
    { path: "/settlement", icon: Banknote,           label: "Settle"  },
    { path: "/chat",       icon: MessagesSquare,     label: "Chat"    },
    { path: "/history",    icon: BookOpen,           label: "History" },
    { path: "/settings",   icon: SlidersHorizontal,  label: "More"    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="glass-panel-heavy border-b-0 border-x-0 rounded-t-3xl mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const isChat = item.path === '/chat';
          const badge = isChat && unreadCount > 0 ? unreadCount : 0;

          return (
            <Link
              key={item.path}
              href={item.path}
              className="relative flex flex-col items-center justify-center p-2 w-16 h-14 cursor-pointer outline-none tap-highlight-transparent"
            >
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    className={`transition-colors duration-300 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold leading-none shadow">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-2xl"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
