/* Day/Night theme, applied before first paint (loaded by app/layout.tsx with the CSP nonce).
   Saved choice in localStorage wins; the first visit follows prefers-color-scheme. */
(function () {
  var theme = "dark";
  try {
    var saved = window.localStorage.getItem("rb_theme");
    if (saved === "light" || saved === "dark") theme = saved;
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) theme = "light";
  } catch (e) {
    /* storage blocked: keep dark */
  }
  var root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
})();
