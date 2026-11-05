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

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
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

/** Thin progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400"
    />
  );
}

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
