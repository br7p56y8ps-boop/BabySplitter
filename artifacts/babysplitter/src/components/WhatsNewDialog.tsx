import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, X } from 'lucide-react';

const CURRENT_VERSION = 'v3.7';

const RELEASE_NOTES = [
  {
    title: 'Settlement Calculation Fix',
    description: 'Fixed bulk settlement logic to correctly exclude already-settled transactions, preventing double-counting.',
  },
  {
    title: 'Real-Time Update Alerts',
    description: 'Added smart notifications so you instantly know when fresh updates and fixes are deployed.',
  },
  {
    title: 'Polished UI & Performance',
    description: 'Various bug fixes, smoother glassmorphism modals, and improved calculation speed.',
  },
];

export function WhatsNewDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('seen_app_version');
    if (lastSeenVersion !== CURRENT_VERSION) {
      // Small delay on load so it feels natural
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('seen_app_version', CURRENT_VERSION);
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-xs glass-panel-heavy rounded-3xl flex flex-col overflow-hidden shadow-2xl"
            style={{ maxHeight: 'min(520px, 88dvh)' }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 shrink-0 flex items-center justify-between border-b border-white/10 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold">What's New</h2>
                  <p className="text-[10px] text-muted-foreground">Release Notes ({CURRENT_VERSION})</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-white/10 dark:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content List */}
            <div className="px-4 py-3 overflow-y-auto flex-1 hide-scrollbar flex flex-col gap-2.5">
              {RELEASE_NOTES.map((note, index) => (
                <div
                  key={index}
                  className="bg-white/20 dark:bg-white/5 border border-white/15 dark:border-white/8 rounded-2xl p-3 flex gap-2.5 items-start"
                >
                  <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-semibold">{note.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {note.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Button */}
            <div className="p-4 pt-2 shrink-0">
              <button
                onClick={handleClose}
                className="w-full h-10 rounded-2xl bg-primary text-white font-bold text-xs shadow-lg shadow-primary/30 flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
              >
                Got it, let's go!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
