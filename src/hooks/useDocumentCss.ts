"use client";

import { useLayoutEffect } from "react";

/**
 * BUG-1404: the CSP no longer allows inline <style> elements without a nonce, so
 * dynamic page rules (@page size, print overrides) go in a constructed stylesheet.
 * Constructed stylesheets are CSSOM, not inline markup, so CSP does not block them.
 */
export function useDocumentCss(css: string) {
  useLayoutEffect(() => {
    if (!css || typeof document === "undefined" || !("adoptedStyleSheets" in document)) return;
    let sheet: CSSStyleSheet;
    try {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
    } catch {
      return;
    }
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    return () => {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    };
  }, [css]);
}