import { motion } from 'framer-motion';

type Tab = 'home' | 'settlement' | 'chat' | 'history';

// ── SVG shape helpers ──────────────────────────────────────────────────────

function Coin({ s = 38 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 38 38" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="19" cy="19" r="16" />
      <circle cx="19" cy="19" r="9" />
      <line x1="14" y1="19" x2="24" y2="19" />
      <line x1="19" y1="14" x2="19" y2="24" />
    </svg>
  );
}

function Bubble({ w = 52, h = 40 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 52 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="44" height="28" rx="9" />
      <path d="M13 30 L10 38 L23 30" />
    </svg>
  );
}

function Person({ s = 40 }: { s?: number }) {
  return (
    <svg width={s * 0.55} height={s} viewBox="0 0 22 42" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="6" r="5" />
      <line x1="11" y1="11" x2="11" y2="27" />
      <path d="M3 19 L11 15 L19 19" />
      <path d="M5 42 L11 27 L17 42" />
    </svg>
  );
}

function Receipt({ s = 44 }: { s?: number }) {
  return (
    <svg width={s * 0.72} height={s} viewBox="0 0 29 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2 H26 V36 L22 33 L18 36 L14 33 L10 36 L6 33 L3 36 Z" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="8" y1="24" x2="17" y2="24" />
    </svg>
  );
}

function ClockFace({ s = 60 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="30" cy="30" r="27" />
      <line x1="30" y1="30" x2="30" y2="10" />
      <line x1="30" y1="30" x2="45" y2="38" />
      <circle cx="30" cy="30" r="2.5" fill="currentColor" />
    </svg>
  );
}

// ── Per-tab animations ─────────────────────────────────────────────────────

function HomeBackground() {
  const coins = [
    { x: '7%',  y: '74%', s: 44, delay: 0,   dur: 10 },
    { x: '26%', y: '83%', s: 30, delay: 1.8,  dur: 9  },
    { x: '50%', y: '69%', s: 50, delay: 3.6,  dur: 11 },
    { x: '70%', y: '79%', s: 34, delay: 5.4,  dur: 10 },
    { x: '87%', y: '63%', s: 26, delay: 2.4,  dur: 12 },
    { x: '16%', y: '56%', s: 38, delay: 7.0,  dur: 9  },
  ];
  return (
    <>
      {coins.map((c, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: c.x, top: c.y }}
          animate={{ y: [0, -140], opacity: [0, 0.9, 0.75, 0] }}
          transition={{
            duration: c.dur,
            delay: c.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.12, 0.85, 1],
          }}
        >
          <Coin s={c.s} />
        </motion.div>
      ))}
    </>
  );
}

function SettlementBackground() {
  return (
    <>
      {/* Left figure — leans right */}
      <motion.div
        className="absolute"
        style={{ left: '6%', top: '34%', transformOrigin: 'bottom center' }}
        animate={{ rotate: [-5, 7, -5] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Person s={78} />
      </motion.div>

      {/* Right figure — mirrored, leans left */}
      <motion.div
        className="absolute"
        style={{ right: '6%', top: '34%', transform: 'scaleX(-1)', transformOrigin: 'bottom center' }}
        animate={{ rotate: [5, -7, 5] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <Person s={78} />
      </motion.div>

      {/* Central speech bubble */}
      <motion.div
        className="absolute"
        style={{ left: '50%', top: '30%', x: '-50%' }}
        animate={{ y: [-5, 5, -5], scale: [1, 1.05, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Bubble w={60} h={46} />
      </motion.div>

      {/* Second smaller bubble */}
      <motion.div
        className="absolute"
        style={{ left: '37%', top: '20%' }}
        animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
      >
        <Bubble w={40} h={30} />
      </motion.div>

      {/* Third bubble on the other side */}
      <motion.div
        className="absolute"
        style={{ right: '28%', top: '22%' }}
        animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
      >
        <Bubble w={36} h={28} />
      </motion.div>
    </>
  );
}

function ChatBackground() {
  const bubbles = [
    { x: '8%',  y: '80%', w: 60, h: 46, delay: 0,   dur: 8.5 },
    { x: '34%', y: '84%', w: 44, h: 34, delay: 1.6,  dur: 7.5 },
    { x: '60%', y: '76%', w: 66, h: 50, delay: 3.2,  dur: 9.5 },
    { x: '77%', y: '81%', w: 38, h: 29, delay: 0.9,  dur: 7   },
    { x: '18%', y: '64%', w: 52, h: 40, delay: 4.7,  dur: 10  },
  ];
  return (
    <>
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: b.x, top: b.y }}
          animate={{ y: [0, -110], opacity: [0, 1, 0.8, 0] }}
          transition={{
            duration: b.dur,
            delay: b.delay,
            repeat: Infinity,
            ease: 'easeOut',
            times: [0, 0.14, 0.82, 1],
          }}
        >
          <Bubble w={b.w} h={b.h} />
        </motion.div>
      ))}
    </>
  );
}

function HistoryBackground() {
  const trail = [
    { x: '10%', y: '80%', s: 48, delay: 0   },
    { x: '26%', y: '70%', s: 40, delay: 0.5 },
    { x: '43%', y: '60%', s: 32, delay: 1.0 },
    { x: '59%', y: '50%', s: 25, delay: 1.5 },
    { x: '73%', y: '41%', s: 18, delay: 2.0 },
  ];
  return (
    <>
      {/* Coin trail — pulsing glow */}
      {trail.map((c, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: c.x, top: c.y }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.06, 0.95] }}
          transition={{ duration: 3.5, delay: c.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Coin s={c.s} />
        </motion.div>
      ))}

      {/* Large clock — background anchor */}
      <motion.div
        className="absolute"
        style={{ right: '4%', top: '28%' }}
        animate={{ opacity: [0.35, 0.65, 0.35], rotate: [-1, 1.5, -1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ClockFace s={96} />
      </motion.div>

      {/* Receipt on the left */}
      <motion.div
        className="absolute"
        style={{ left: '4%', top: '33%' }}
        animate={{ opacity: [0.3, 0.65, 0.3], rotate: [-3, 2, -3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Receipt s={58} />
      </motion.div>
    </>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────

export function TabBackground({ tab }: { tab: Tab }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden text-black dark:text-white">
      {tab === 'home'       && <HomeBackground />}
      {tab === 'settlement' && <SettlementBackground />}
      {tab === 'chat'       && <ChatBackground />}
      {tab === 'history'    && <HistoryBackground />}
    </div>
  );
}
