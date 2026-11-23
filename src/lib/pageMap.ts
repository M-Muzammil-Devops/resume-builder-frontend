/**
 * Pure page-map math for the Rearrange modal: turns measured section boxes from the live
 * ResumeCanvas (sheet stride = page height + 36px gap, content inset by the page margin)
 * into per-page segments with the share of the printable page each one covers.
 * Kept dependency-free so it can be unit-tested from the backend test runner.
 */
export type MeasuredSection = { id: string; top: number; height: number };

export type PageGeometry = {
  /** Height of one sheet in CSS px (A4 ≈ 1123, Letter ≈ 1056). */
  pagePx: number;
  /** Gap between sheets in the editor canvas. */
  gap: number;
  /** Top/bottom page margin in px. */
  pad: number;
};

export type PageSegment = {
  id: string;
  page: number;
  /** Offset from the top of the printable area, 0..1. */
  offset: number;
  /** Share of the printable area this piece covers, 0..1. */
  fraction: number;
  continuedFromPrev: boolean;
  continuesOnNext: boolean;
};

export type PageMap = {
  pages: number;
  segments: PageSegment[];
  /** Per page: lowest content bottom as a share of the printable area (0..1). */
  used: number[];
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function buildPageMap(
  items: MeasuredSection[],
  geo: PageGeometry,
  minPages = 1
): PageMap {
  const stride = geo.pagePx + geo.gap;
  const usable = Math.max(1, geo.pagePx - 2 * geo.pad);
  const raw: PageSegment[] = [];

  for (const item of items) {
    if (!(item.height > 0)) continue;
    const top = item.top;
    const bottom = item.top + item.height;
    const first = Math.max(0, Math.floor(top / stride));
    const last = Math.max(first, Math.floor((bottom - 1) / stride));
    const mine: PageSegment[] = [];
    for (let p = first; p <= last; p += 1) {
      const contentTop = p * stride + geo.pad;
      const contentBottom = p * stride + geo.pagePx - geo.pad;
      // A header/banner may sit inside the top margin on page 1 — keep it visible there.
      const segTop = Math.max(top, p === 0 ? Math.min(top, contentTop) : contentTop);
      // Clip at the bottom margin: anything past it is printed on the next page.
      const segBottom = Math.min(bottom, contentBottom);
      if (segBottom - segTop < 4) continue;
      mine.push({
        id: item.id,
        page: p,
        offset: clamp01((segTop - contentTop) / usable),
        fraction: clamp01((segBottom - segTop) / usable),
        continuedFromPrev: false,
        continuesOnNext: false,
      });
    }
    mine.forEach((seg, i) => {
      seg.continuedFromPrev = i > 0;
      seg.continuesOnNext = i < mine.length - 1;
    });
    raw.push(...mine);
  }

  const maxPage = raw.reduce((m, s) => Math.max(m, s.page), 0);
  const pages = Math.max(minPages, maxPage + 1, 1);
  const used = Array.from({ length: pages }, () => 0);
  for (const seg of raw) {
    used[seg.page] = Math.max(used[seg.page], clamp01(seg.offset + seg.fraction));
  }
  return { pages, segments: raw, used };
}

/** "12% free" helper — never negative, rounded to whole percent. */
export function freePercent(used: number): number {
  return Math.max(0, Math.round((1 - used) * 100));
}

/** Rounded share label; tiny sections still show at least 1%. */
export function sharePercent(fraction: number): number {
  return fraction > 0 ? Math.max(1, Math.round(fraction * 100)) : 0;
}
