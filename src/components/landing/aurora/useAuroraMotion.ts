"use client";

import { type RefObject, useEffect, useSyncExternalStore } from "react";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(callback: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/** True when the OS asks for less motion (Windows "Animation effects" off, etc.). */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false
  );
}

/** Reveal settings (BUG-1318). Exported for the unit test. */
export const REVEAL_ROOT_MARGIN = "200px 0px";
/** Extra px above/below the viewport that the scroll-end sweep treats as "in view". */
export const REVEAL_SWEEP_MARGIN = 200;

/** True when a box (viewport coords) touches the viewport grown by `margin` px top and bottom. */
export function inRevealBand(top: number, bottom: number, viewportHeight: number, margin = REVEAL_SWEEP_MARGIN) {
  return bottom >= -margin && top <= viewportHeight + margin;
}

/**
 * Parallax shift for one [data-depth] node from CACHED geometry (BUG-1319): no layout reads per frame.
 * docTop/height are the node's untransformed document position; returns null when off-screen (skip write).
 */
export function parallaxShift(docTop: number, height: number, depth: number, scrollY: number, viewportHeight: number, margin = 200) {
  const top = docTop - scrollY;
  if (top + height < -margin || top > viewportHeight + margin) return null;
  return Math.round((top + height / 2 - viewportHeight / 2) * depth * 2) / 2;
}

/**
 * BUG-1319: ONE passive window scroll listener for the whole landing page. Subscribers run once per
 * animation frame with window.scrollY (no layout reads); `onStart` hooks run synchronously on the
 * first scroll/wheel event of a gesture (used to pause the floats before the next frame).
 */
type FrameSub = (scrollY: number) => void;
const frameSubs = new Set<FrameSub>();
const startSubs = new Set<() => void>();
let busFrame = 0;
const busFlush = () => {
  busFrame = 0;
  const y = window.scrollY;
  frameSubs.forEach((f) => f(y));
};
const busScroll = () => {
  startSubs.forEach((f) => f());
  if (!busFrame) busFrame = requestAnimationFrame(busFlush);
};
const busWheel = () => startSubs.forEach((f) => f());
function busSync() {
  const want = frameSubs.size + startSubs.size > 0;
  const w = window as Window & { __rbScrollBus?: boolean };
  if (want && !w.__rbScrollBus) {
    window.addEventListener("scroll", busScroll, { passive: true });
    window.addEventListener("wheel", busWheel, { passive: true });
    w.__rbScrollBus = true;
  } else if (!want && w.__rbScrollBus) {
    window.removeEventListener("scroll", busScroll);
    window.removeEventListener("wheel", busWheel);
    cancelAnimationFrame(busFrame);
    busFrame = 0;
    w.__rbScrollBus = false;
  }
}
export function onScrollFrame(cb: FrameSub) {
  frameSubs.add(cb);
  busSync();
  return () => {
    frameSubs.delete(cb);
    busSync();
  };
}
export function onScrollStart(cb: () => void) {
  startSubs.add(cb);
  busSync();
  return () => {
    startSubs.delete(cb);
    busSync();
  };
}

/**
 * Scroll reveal ([data-reveal]), scroll parallax ([data-depth]) and pointer tilt ([data-tilt]).
 * Everything is written through the CSSOM (no style attributes in markup) so it stays CSP-safe.
 * Reduced motion: content is shown at once, no parallax, no tilt.
 */
export function useAuroraMotion(
  rootRef: RefObject<HTMLElement | null>,
  revealClass: string,
  jsClass: string,
  reduced: boolean,
  instantClass?: string
) {
  // Reveal on scroll (BUG-1318): early (200px margin, threshold 0), short opacity-only fade,
  // instant for anything already on screen (load, anchor jump, hash change, big jumps), and a
  // sweep on scrollend (debounced fallback) so a fast fling never leaves blank sections.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduced || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add(revealClass));
      return;
    }
    const pending = new Set(nodes);
    let instantTimer = 0;
    let holdTimer = 0;
    let sweepTimer = 0;
    let sweepFrame = 0;
    let lastY = window.scrollY;

    const reveal = (node: HTMLElement) => {
      node.classList.add(revealClass);
      pending.delete(node);
      io.unobserve(node);
    };
    /** Reveal every pending node in (or near) the viewport. One batched read pass, then writes. */
    const sweep = (instant: boolean) => {
      sweepFrame = 0;
      if (!pending.size) return;
      const vh = window.innerHeight;
      const hits: HTMLElement[] = [];
      for (const node of pending) {
        const r = node.getBoundingClientRect();
        if (inRevealBand(r.top, r.bottom, vh)) hits.push(node);
      }
      if (!hits.length) return;
      if (instant && instantClass) {
        root.classList.add(instantClass);
        window.clearTimeout(instantTimer);
        instantTimer = window.setTimeout(() => {
          if (!holdTimer) root.classList.remove(instantClass);
        }, 60);
      }
      hits.forEach(reveal);
    };
    const queueSweep = (instant: boolean) => {
      if (sweepFrame) cancelAnimationFrame(sweepFrame);
      sweepFrame = requestAnimationFrame(() => sweep(instant));
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      },
      { threshold: 0, rootMargin: REVEAL_ROOT_MARGIN }
    );
    root.classList.add(jsClass);
    // Already on screen at mount (first paint, restored scroll, deep link): show with no fade.
    sweep(true);
    pending.forEach((node) => io.observe(node));

    const hasScrollEnd = "onscrollend" in window;
    const onScroll = (y: number) => {
      // A jump (anchor, Home/End, scrollbar drag, fling) of more than a screen: show what lands at once.
      if (Math.abs(y - lastY) > window.innerHeight) queueSweep(true);
      lastY = y;
      if (!hasScrollEnd) {
        window.clearTimeout(sweepTimer);
        sweepTimer = window.setTimeout(() => queueSweep(false), 120);
      }
    };
    const onScrollEnd = () => queueSweep(false);
    /** BUG-1318: anchor jump / hash change — reveal the target section and the viewport at once, no fade. */
    const holdInstant = () => {
      if (!instantClass) return;
      root.classList.add(instantClass);
      window.clearTimeout(holdTimer);
      window.clearTimeout(instantTimer);
      holdTimer = window.setTimeout(() => {
        holdTimer = 0;
        root.classList.remove(instantClass);
      }, 900);
    };
    const revealHash = (hash: string) => {
      let target: HTMLElement | null = null;
      try {
        target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      } catch {
        target = null;
      }
      if (!target) return;
      holdInstant();
      for (const node of Array.from(pending)) if (target.contains(node) || node.contains(target)) reveal(node);
    };
    const onHash = () => {
      revealHash(window.location.hash);
      queueSweep(true);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!a) return;
      revealHash(a.getAttribute("href") || "");
      // After the jump lands, everything in view shows at once too (same hash = no hashchange).
      requestAnimationFrame(() => queueSweep(true));
    };
    if (window.location.hash) revealHash(window.location.hash);
    const offScroll = onScrollFrame(onScroll);
    document.addEventListener("click", onClick, true);
    if (hasScrollEnd) window.addEventListener("scrollend", onScrollEnd, { passive: true });
    window.addEventListener("hashchange", onHash);
    window.addEventListener("pageshow", onHash);
    return () => {
      io.disconnect();
      cancelAnimationFrame(sweepFrame);
      window.clearTimeout(sweepTimer);
      window.clearTimeout(instantTimer);
      window.clearTimeout(holdTimer);
      offScroll();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("pageshow", onHash);
      root.classList.remove(jsClass);
      if (instantClass) root.classList.remove(instantClass);
    };
  }, [rootRef, revealClass, jsClass, reduced, instantClass]);

  // Scroll parallax for floating 3D shapes and characters (BUG-1319).
  // Geometry is measured once (and again on resize / layout change), never inside the scroll frame.
  // Each frame only reads window.scrollY and writes transforms of on-screen nodes that changed.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]"));
    if (reduced || !nodes.length) {
      nodes.forEach((node) => node.style.removeProperty("transform"));
      return;
    }
    type Item = { node: HTMLElement; depth: number; docTop: number; height: number; shift: number | null };
    const items: Item[] = nodes.map((node) => ({ node, depth: Number(node.dataset.depth) || 0, docTop: 0, height: 0, shift: null }));
    let vh = window.innerHeight;
    let frame = 0;
    let measureTimer = 0;

    const measure = () => {
      vh = window.innerHeight;
      const y = window.scrollY;
      // Batched reads; subtract the shift we applied so docTop is the untransformed position.
      for (const it of items) {
        const r = it.node.getBoundingClientRect();
        it.docTop = r.top + y - (it.shift ?? 0);
        it.height = r.height;
      }
    };
    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      for (const it of items) {
        const shift = parallaxShift(it.docTop, it.height, it.depth, y, vh);
        if (shift === null || shift === it.shift) continue;
        it.shift = shift;
        it.node.style.transform = `translate3d(0, ${shift}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const remeasure = () => {
      window.clearTimeout(measureTimer);
      measureTimer = window.setTimeout(() => {
        measure();
        onScroll();
      }, 150);
    };
    measure();
    paint();
    // Page height changes (FAQ open, images, fonts) move the shapes: re-measure, debounced.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(remeasure) : null;
    ro?.observe(root);
    const offScroll = onScrollFrame(() => paint());
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(measureTimer);
      ro?.disconnect();
      offScroll();
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("load", remeasure);
      nodes.forEach((node) => node.style.removeProperty("transform"));
    };
  }, [rootRef, reduced]);

  // Pointer tilt on cards (mouse only).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    let active: HTMLElement | null = null;
    const reset = (node: HTMLElement | null) => {
      node?.style.removeProperty("--tx");
      node?.style.removeProperty("--ty");
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-tilt]") : null;
      if (target !== active) {
        reset(active);
        active = target;
      }
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      const max = Number(target.dataset.tilt) || 8;
      target.style.setProperty("--tx", `${(x * max).toFixed(2)}deg`);
      target.style.setProperty("--ty", `${(-y * max).toFixed(2)}deg`);
    };
    const onLeave = () => {
      reset(active);
      active = null;
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      reset(active);
    };
  }, [rootRef, reduced]);
}

/** Hero: the 3D resume sheet and chips follow the pointer with eased depth. */
/**
 * BUG-1319: the infinite "floaty" animations only run while on screen (IntersectionObserver sets
 * data-off), and the on-screen ones pause while the page scrolls — wheel, touch, keys or scrollbar.
 * The pause is a data-pause attribute on just the on-screen float nodes (a handful), NOT a class on
 * the page root, so starting/stopping a scroll restyles a few elements instead of the whole tree.
 * The scroll hooks ride the shared passive scroll bus (one listener for the page).
 */
export function useFloatPause(rootRef: RefObject<HTMLElement | null>, selector: string, _scrollingClass: string, reduced: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const inView = new Set<HTMLElement>(nodes);
    let io: IntersectionObserver | null = null;
    let on = false;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const el = e.target as HTMLElement;
            if (e.isIntersecting) {
              el.removeAttribute("data-off");
              inView.add(el);
              if (on) el.setAttribute("data-pause", "");
            } else {
              el.setAttribute("data-off", "");
              el.removeAttribute("data-pause");
              inView.delete(el);
            }
          }
        },
        { rootMargin: "100px 0px" }
      );
      nodes.forEach((n) => io!.observe(n));
    }
    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      if (on) inView.forEach((n) => n.removeAttribute("data-pause"));
      on = false;
    };
    const start = () => {
      if (!on) {
        inView.forEach((n) => n.setAttribute("data-pause", ""));
        on = true;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(stop, 160);
    };
    const offStart = onScrollStart(start);
    window.addEventListener("scrollend", stop, { passive: true });
    return () => {
      io?.disconnect();
      stop();
      offStart();
      nodes.forEach((n) => {
        n.removeAttribute("data-off");
        n.removeAttribute("data-pause");
      });
      window.removeEventListener("scrollend", stop);
    };
  }, [rootRef, selector, reduced]);
}

export function useHeroPointer(heroRef: RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (reduced) {
      hero.style.removeProperty("--mx");
      hero.style.removeProperty("--my");
      return;
    }
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let frame = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      hero.style.setProperty("--mx", cx.toFixed(3));
      hero.style.setProperty("--my", cy.toFixed(3));
      frame = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = hero.getBoundingClientRect();
      tx = (event.clientX - rect.left) / rect.width - 0.5;
      ty = (event.clientY - rect.top) / rect.height - 0.5;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.style.removeProperty("--mx");
      hero.style.removeProperty("--my");
    };
  }, [heroRef, reduced]);
}
