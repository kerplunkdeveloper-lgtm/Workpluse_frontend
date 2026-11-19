"use client";

/**
 * Motion primitives for the marketing site.
 *
 * Sections stay Server Components (good for SEO and the static/ISR cache); these
 * small client wrappers take server-rendered `children` and only add behaviour.
 * Everything honours prefers-reduced-motion: content still appears, without movement.
 * Above-the-fold hero motion is plain CSS (see `.lp-in` in globals.css) so it never
 * waits for hydration.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;
const VIEWPORT = { once: true, margin: "-70px" } as const;

/* ── Reveal on scroll ─────────────────────────────────────────────────────── */

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: reduce ? 0 : 0.75, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Staggered groups ─────────────────────────────────────────────────────── */

type Tag = "div" | "ul" | "ol" | "li" | "article" | "section";
const TAGS = { div: motion.div, ul: motion.ul, ol: motion.ol, li: motion.li, article: motion.article, section: motion.section } as const;

export function Stagger({
  children,
  className,
  as = "div",
  gap = 0.09,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: Extract<Tag, "div" | "ul" | "ol">;
  gap?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const Component = TAGS[as];
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : gap, delayChildren: reduce ? 0 : delay } },
  };
  return (
    <Component className={className} variants={variants} initial="hidden" whileInView="show" viewport={VIEWPORT}>
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
  spotlight = false,
}: {
  children: ReactNode;
  className?: string;
  as?: Tag;
  /** Adds a soft glow that follows the pointer (used on bento cards). */
  spotlight?: boolean;
}) {
  const reduce = useReducedMotion();
  const Component = TAGS[as];
  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 28, scale: reduce ? 1 : 0.985 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: reduce ? 0 : 0.7, ease: EASE } },
  };
  return (
    <Component
      className={spotlight ? `lp-spot ${className ?? ""}` : className}
      variants={variants}
      onPointerMove={
        spotlight
          ? (event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
              event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
            }
          : undefined
      }
    >
      {children}
    </Component>
  );
}

/* ── Count-up numbers ─────────────────────────────────────────────────────── */

/** Server HTML contains the final value, so crawlers and no-JS users see real numbers. */
export function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.6,
  className,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!inView || reduce || !node) return;
    const format = (value: number) =>
      `${prefix}${value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    const controls = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate: (value) => {
        node.textContent = format(value);
      },
    });
    return () => controls.stop();
  }, [inView, reduce, to, decimals, prefix, suffix, duration]);

  const initial = `${prefix}${to.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}

/* ── Scroll-linked pieces ─────────────────────────────────────────────────── */

/** Product preview that settles flat as it scrolls into view. */
export function TiltOnScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 95%", "start 35%"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.93, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [reduce ? 1 : 0.4, 1]);
  return (
    <div className={className} style={{ perspective: 1600 }}>
      <motion.div ref={ref} style={{ rotateX, scale, opacity, transformOrigin: "50% 0%" }}>
        {children}
      </motion.div>
    </div>
  );
}

/** Horizontal connector that draws itself between workflow steps. */
export function DrawLine({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className={className}
      style={{ transformOrigin: "0% 50%" }}
      initial={{ scaleX: reduce ? 1 : 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: reduce ? 0 : 1.4, delay: reduce ? 0 : 0.2, ease: EASE }}
    />
  );
}

/* ── Dashboard preview pieces ─────────────────────────────────────────────── */

/** Trend chart whose line draws in when the dashboard scrolls into view. */
export function AnimatedTrend({ line, area, last }: { line: string; area: string; last: readonly [number, number] }) {
  const reduce = useReducedMotion();
  return (
    <>
      <motion.path
        d={area}
        fill="url(#lp-hero-trend-fill-light)"
        initial={{ opacity: reduce ? 1 : 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduce ? 0 : 1, delay: reduce ? 0 : 0.8 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="#4f46e5"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduce ? 0 : 1.6, delay: reduce ? 0 : 0.3, ease: "easeInOut" }}
      />
      <motion.circle
        cx={last[0]}
        cy={last[1]}
        r="4.5"
        fill="#4f46e5"
        stroke="#ffffff"
        strokeWidth="2"
        initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 1.8 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
    </>
  );
}

export type PunchItem = {
  initials: string;
  name: string;
  place: string;
  time: string;
  status: string;
  tone: string;
  avatar: string;
};

/** Punch feed that keeps receiving new entries while it is on screen. */
export function LivePunchFeed({ items, visible = 4 }: { items: readonly PunchItem[]; visible?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -10% 0px" });
  const [feed, setFeed] = useState(() => items.slice(0, visible).map((item, index) => ({ item, key: index })));
  const cursor = useRef(visible);

  useEffect(() => {
    if (reduce || !inView) return;
    const timer = window.setInterval(() => {
      const next = cursor.current++;
      setFeed((current) => [{ item: items[next % items.length], key: next }, ...current].slice(0, visible));
    }, 2600);
    return () => window.clearInterval(timer);
  }, [reduce, inView, items, visible]);

  return (
    <ul ref={ref} className="mt-3 space-y-2.5">
      <AnimatePresence initial={false} mode="popLayout">
        {feed.map(({ item: p, key }) => (
          <motion.li
            key={key}
            layout={!reduce}
            initial={{ opacity: 0, y: reduce ? 0 : -18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
            className="flex items-center gap-2.5 rounded-xl bg-slate-50/60 p-2 ring-1 ring-slate-100"
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${p.avatar}`}>
              {p.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">{p.name}</p>
              <p className="truncate text-[10px] text-slate-500">
                {p.place} • {p.time}
              </p>
            </div>
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${p.tone}`}>{p.status}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}


/* ── Parallax section ─────────────────────────────────────────────────────── */

/** Scroll-linked parallax wrapper. `speed` controls how fast children move: 0.5 = half speed, 1.5 = faster. */
export function ParallaxSection({
  children,
  className,
  speed = 0.5,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-80 * speed, 80 * speed]);
  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/* ── Magnetic button ──────────────────────────────────────────────────────── */

/** Button wrapper that follows cursor position within its bounds, creating a magnetic pull effect. */
export function MagneticButton({
  children,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  /** How strongly the element follows the cursor (0–1). */
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      x.set(dx * strength);
      y.set(dy * strength);
    },
    [reduce, strength, x, y],
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

/* ── Text reveal by word ──────────────────────────────────────────────────── */

function RevealWord({ word, range, progress }: { word: string; range: [number, number]; progress: import("framer-motion").MotionValue<number> }) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block mr-[0.25em]">
      {word}
    </motion.span>
  );
}

/** Heading that reveals text word-by-word as user scrolls. */
export function TextRevealByWord({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 35%"] });
  const words = text.split(" ");

  if (reduce) {
    return <p ref={ref} className={className}>{text}</p>;
  }

  return (
    <p ref={ref} className={className} style={{ display: "flex", flexWrap: "wrap" }}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = (i + 1) / words.length;
        return <RevealWord key={`${word}-${i}`} word={word} range={[start, end]} progress={scrollYProgress} />;
      })}
    </p>
  );
}

/* ── Floating element ─────────────────────────────────────────────────────── */

/** Wrapper that adds continuous floating animation. */
export function FloatingElement({
  children,
  className,
  amplitude = 10,
  duration = 3,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Vertical float distance in pixels. */
  amplitude?: number;
  /** Full cycle duration in seconds. */
  duration?: number;
  /** Start delay in seconds. */
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={
        reduce
          ? {}
          : {
              y: [-amplitude, amplitude, -amplitude],
            }
      }
      transition={
        reduce
          ? undefined
          : {
              y: { duration, repeat: Infinity, repeatType: "loop", ease: "easeInOut", delay },
            }
      }
    >
      {children}
    </motion.div>
  );
}

/* ── Blur fade in ─────────────────────────────────────────────────────────── */

/** Reveal component combining blur(10px)→blur(0) with y-translate and opacity. */
export function BlurFadeIn({
  children,
  className,
  delay = 0,
  y = 20,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y, filter: reduce ? "blur(0px)" : "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={VIEWPORT}
      transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Number ticker ────────────────────────────────────────────────────────── */

/** Enhanced count-up with spring physics and a subtle scale pulse on completion. */
export function NumberTicker({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!inView || reduce || !node) return;
    const format = (value: number) =>
      `${prefix}${value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    const controls = animate(0, to, {
      type: "spring",
      stiffness: 50,
      damping: 15,
      mass: 1,
      onUpdate: (value) => {
        node.textContent = format(value);
      },
      onComplete: () => setDone(true),
    });
    return () => controls.stop();
  }, [inView, reduce, to, decimals, prefix, suffix]);

  const initial = `${prefix}${to.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  return (
    <motion.span
      ref={ref}
      className={className}
      animate={done && !reduce ? { scale: [1, 1.12, 1] } : undefined}
      transition={done ? { duration: 0.35, ease: EASE } : undefined}
    >
      {initial}
    </motion.span>
  );
}

/* ── Animated beam ────────────────────────────────────────────────────────── */

/** SVG component that draws an animated beam between two points. */
export function AnimatedBeam({
  fromX,
  fromY,
  toX,
  toY,
  className,
  width = 2,
  color = "#4f46e5",
  duration = 2,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  className?: string;
  width?: number;
  color?: string;
  /** Duration of the beam animation in seconds. */
  duration?: number;
}) {
  const reduce = useReducedMotion();

  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  /* Slight vertical curve for visual depth */
  const controlY = midY - Math.abs(toX - fromX) * 0.15;
  const d = `M ${fromX} ${fromY} Q ${midX} ${controlY} ${toX} ${toY}`;

  return (
    <svg className={className} style={{ overflow: "visible", position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {/* Track */}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeOpacity={0.12} />
      {/* Animated beam */}
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        initial={{ pathLength: reduce ? 1 : 0, pathOffset: 0 }}
        animate={reduce ? {} : { pathLength: [0, 0.4, 0], pathOffset: [0, 0.3, 1] }}
        transition={reduce ? undefined : { duration, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

/* ── Glow card ────────────────────────────────────────────────────────────── */

/** Card wrapper with a gradient glow that follows the cursor. */
export function GlowCard({
  children,
  className,
  glowSize = 350,
  glowColor = "rgba(79,70,229,0.15)",
}: {
  children: ReactNode;
  className?: string;
  /** Diameter of the glow in pixels. */
  glowSize?: number;
  /** CSS colour used for the glow centre. */
  glowColor?: string;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);

  const bg = useMotionTemplate`radial-gradient(${glowSize}px circle at ${mx}px ${my}px, ${glowColor}, transparent 80%)`;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mx.set(e.clientX - rect.left);
      my.set(e.clientY - rect.top);
    },
    [reduce, mx, my],
  );

  const handleMouseLeave = useCallback(() => {
    mx.set(-1000);
    my.set(-1000);
  }, [mx, my]);

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {!reduce && (
        <motion.div
          aria-hidden="true"
          style={{ background: bg, position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ── Hero video dialog ────────────────────────────────────────────────────── */

/** Animated dialog/modal that zooms in from a thumbnail with spring physics. */
export function HeroVideoDialog({
  children,
  thumbnail,
  className,
}: {
  /** Content shown inside the dialog (e.g. an iframe or video element). */
  children: ReactNode;
  /** Thumbnail preview shown before the dialog is opened. */
  thumbnail: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <>
      <motion.button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        whileHover={reduce ? {} : { scale: 1.02 }}
        whileTap={reduce ? {} : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {thumbnail}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.25 }}
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
              }}
            />
            {/* Dialog */}
            <motion.div
              key="dialog"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 24 }}
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 51,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
              }}
            >
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 960 }}>
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Scroll progress ──────────────────────────────────────────────────────── */

/** Fixed bar at the top showing page scroll progress. */
export function ScrollProgress({
  className,
  color = "#4f46e5",
  height = 3,
}: {
  className?: string;
  /** Bar colour. */
  color?: string;
  /** Bar height in pixels. */
  height?: number;
}) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  if (reduce) return null;

  return (
    <motion.div
      className={className}
      style={{
        scaleX: scrollYProgress,
        transformOrigin: "0% 0%",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height,
        background: color,
        zIndex: 9999,
      }}
    />
  );
}
