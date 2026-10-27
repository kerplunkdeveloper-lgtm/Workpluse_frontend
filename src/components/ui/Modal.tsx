"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
} as const;

interface DialogProps {
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Shown to the left of the title, e.g. a coloured icon tile. */
  icon?: React.ReactNode;
  size?: keyof typeof SIZES;
  /** Buttons pinned to the bottom of the dialog. */
  footer?: React.ReactNode;
  /** While true the dialog cannot be dismissed (a save is in flight). */
  busy?: boolean;
  /** Renders the dialog as a form, so Enter submits and a submit button in `footer` works. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}

/** Just the dimmed, centred backdrop: the children draw their own panel. */
interface BackdropProps {
  title?: undefined;
  /** Click outside the panel and Escape call this when given. */
  onClose?: () => void;
  /** Stacking order, for a dialog opened on top of another. */
  z?: number;
  children: React.ReactNode;
}

export type ModalProps = DialogProps | BackdropProps;

/** Page scroll lock, Escape to close and focus return, shared by both forms of the modal. */
function useDialogBehaviour(onClose: (() => void) | undefined, busy: boolean, panelRef: React.RefObject<HTMLElement | null>, focusInside: boolean) {
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  // Kept current after each render, so the listener below never needs to be re-attached.
  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) closeRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    if (focusInside) {
      const first = panelRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea");
      (first || panelRef.current)?.focus();
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (focusInside) previouslyFocused?.focus?.();
    };
  }, [panelRef, focusInside]);
}

/**
 * The one dialog shell for the app. Two ways to use it:
 *  - `<Modal title=... onClose=... footer=...>`: the full dialog. Header and footer stay put while the body
 *    scrolls, Enter submits when `onSubmit` is given, focus moves inside and returns afterwards, and it
 *    slides up as a sheet on phones.
 *  - `<Modal>` with only children: the dimmed centred backdrop for panels that draw their own chrome.
 * Both lock page scroll and close on Escape. Render it only while it should be visible.
 */
export default function Modal(props: ModalProps) {
  if (props.title === undefined) return <Backdrop {...(props as BackdropProps)} />;
  return <Dialog {...(props as DialogProps)} />;
}

function Backdrop({ onClose, z = 50, children }: BackdropProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogBehaviour(onClose, false, ref, false);
  return (
    <div
      ref={ref}
      style={{ zIndex: z }}
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      {children}
    </div>
  );
}

function Dialog({ onClose, title, description, icon, size = "md", footer, busy = false, onSubmit, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  useDialogBehaviour(onClose, busy, panelRef, true);

  const panelClass = `flex max-h-[92dvh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl outline-none sm:max-h-[min(88dvh,calc(100dvh-3rem))] sm:rounded-3xl`;
  const content = (
    <>
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {icon}
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold leading-snug text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">{children}</div>
      {footer && <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">{footer}</footer>}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      {onSubmit ? (
        <form onSubmit={onSubmit} ref={panelRef as React.Ref<HTMLFormElement>} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={panelClass}>
          {content}
        </form>
      ) : (
        <div ref={panelRef as React.Ref<HTMLDivElement>} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={panelClass}>
          {content}
        </div>
      )}
    </div>
  );
}
