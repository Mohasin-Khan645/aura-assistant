// Publish settings helper — small client-side utilities for ARIA's
// publish/branding flow. The actual badge visibility is controlled at the
// Lovable platform level (Pro plan required), but this helper:
//   • Tracks the user's preferred badge visibility locally
//   • Provides a defensive DOM cleaner for any leftover injected badges
//   • Exposes copy-to-clipboard helpers for the published URL

const PREF_KEY = "aria.publish.hideBadge";
const URL_KEY = "aria.publish.url";

export type PublishPreferences = {
  hideBadge: boolean;
  publishedUrl: string | null;
};

export const loadPublishPrefs = (): PublishPreferences => {
  try {
    return {
      hideBadge: localStorage.getItem(PREF_KEY) === "1",
      publishedUrl: localStorage.getItem(URL_KEY),
    };
  } catch {
    return { hideBadge: false, publishedUrl: null };
  }
};

export const setHideBadgePref = (hide: boolean) => {
  try { localStorage.setItem(PREF_KEY, hide ? "1" : "0"); } catch { /* ignore */ }
  if (hide) scrubInjectedBadges();
};

export const setPublishedUrl = (url: string | null) => {
  try {
    if (url) localStorage.setItem(URL_KEY, url);
    else localStorage.removeItem(URL_KEY);
  } catch { /* ignore */ }
};

/**
 * Defensive cleaner — removes any DOM nodes that look like an injected
 * "Edit with Lovable" badge. The CSS rules in index.css already hide them,
 * but this fully removes them for screen readers / hit-testing too.
 */
export const scrubInjectedBadges = () => {
  if (typeof document === "undefined") return;
  const selectors = [
    "#lovable-badge",
    "[id*='lovable-badge']",
    "a[href*='lovable.dev'][class*='badge' i]",
    "a[href*='lovable.app'][class*='badge' i]",
    "iframe[src*='lovable.dev/badge']",
    "[data-lovable-badge]",
  ];
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((n) => n.remove());
  }
};

/**
 * Watch the DOM for badge injections (e.g. host-injected after load) and
 * remove them when the user has opted into hiding. Returns an unsubscribe.
 */
export const watchAndScrubBadges = (): (() => void) => {
  if (typeof document === "undefined" || !("MutationObserver" in window)) return () => {};
  const prefs = loadPublishPrefs();
  if (!prefs.hideBadge) return () => {};
  scrubInjectedBadges();
  const obs = new MutationObserver(() => scrubInjectedBadges());
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
};

export const copyPublishedUrl = async (url: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
};
