import { Link, useLocation } from "wouter";
import { Home, Receipt, MessageCircle, Clock, Settings } from "lucide-react";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/settlement", icon: Receipt, label: "Settle" },
    { path: "/chat", icon: MessageCircle, label: "Chat" },
    { path: "/history", icon: Clock, label: "History" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="glass-panel-heavy border-b-0 border-x-0 rounded-t-3xl mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} className="relative flex flex-col items-center justify-center p-2 w-16 h-14 cursor-pointer outline-none tap-highlight-transparent">
              <div className="relative z-10 flex flex-col items-center gap-1">
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors duration-300 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                />
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
