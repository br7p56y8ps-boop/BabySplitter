import { Bell, RefreshCw, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useQueries";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export function AppBar({
  title,
  showRefresh = true,
  showBell = false,
  action,
}: {
  title: string;
  showRefresh?: boolean;
  showBell?: boolean;
  action?: React.ReactNode;
}) {
  const [showNotifs, setShowNotifs] = useState(false);
  const { data: notifications, refetch, isFetching } = useNotifications();
  const { identity } = useAuth();
  const [isRotating, setIsRotating] = useState(false);

  // Per-user clear timestamp stored in localStorage
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  useEffect(() => {
    if (identity) {
      setClearedAt(localStorage.getItem(`notif_cleared_${identity}`));
    }
  }, [identity]);

  // Filter: exclude chat messages, exclude items cleared by this user, limit to 10
  const visibleNotifications = (notifications || [])
    .filter(n => n.type !== 'chat' && n.type !== 'chat_message')
    .filter(n => !clearedAt || new Date(n.created_at) > new Date(clearedAt))
    .slice(0, 10);

  const handleRefresh = () => {
    setIsRotating(true);
    refetch().finally(() => setTimeout(() => setIsRotating(false), 500));
  };

  const handleClear = () => {
    if (identity) {
      const now = new Date().toISOString();
      localStorage.setItem(`notif_cleared_${identity}`, now);
      setClearedAt(now);
      setShowNotifs(false);
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 safe-top">
        <div className="glass-panel-heavy border-t-0 border-x-0 rounded-b-3xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {action}
            {showRefresh && (
              <button
                onClick={handleRefresh}
                className="w-10 h-10 rounded-full flex items-center justify-center glass-button outline-none"
              >
                <RefreshCw size={20} className={`text-foreground ${isRotating || isFetching ? 'animate-spin' : ''}`} />
              </button>
            )}
            {showBell && (
              <button
                onClick={() => setShowNotifs(true)}
                className="relative w-10 h-10 rounded-full flex items-center justify-center glass-button outline-none"
              >
                <Bell size={20} className="text-foreground" />
                {visibleNotifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showNotifs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowNotifs(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm max-h-[70vh] glass-panel-heavy rounded-3xl p-6 flex flex-col gap-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Notifications</h2>
                <div className="flex items-center gap-2">
                  {visibleNotifications.length > 0 && (
                    <button
                      onClick={handleClear}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifs(false)}
                    className="w-8 h-8 flex items-center justify-center glass-button rounded-full text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 hide-scrollbar flex flex-col gap-3">
                {visibleNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No notifications</div>
                ) : (
                  visibleNotifications.map((n) => (
                    <div key={n.id} className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10">
                      <h3 className="font-semibold text-sm mb-1">{n.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/60">{format(new Date(n.created_at), 'dd MMM, HH:mm')}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
