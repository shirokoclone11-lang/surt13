import { outer } from '@/core/outer.js';

const AD_SELECTORS = [
  // Video ads
  '#ad-block',
  '#ad-container',
  '#video-ad',
  '.ad-container',
  '.video-ad',
  // Banners
  '.ad-banner',
  '.ad-unit',
  '.ad-placement',
  // Google Ads
  'ins.adsbygoogle',
  '[id^="google_ads"]',
  '[id^="div-gpt-ad"]',
  // Others
  '.sponsored',
  '.advertisement',
  '#ad-bottom',
  '#ad-top',
  '#ad-side',
  // Surviv specific
  '#ad-block-content',
  '.ad-block-content',
  '#surviv-ad',
  '.surviv-ad',
];

const hideAds = () => {
  const doc = outer.document;

  AD_SELECTORS.forEach(selector => {
    try {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.width = '0';
        el.style.overflow = 'hidden';
        el.remove();
      });
    } catch { }
  });
};

const blockAdScripts = () => {
  const doc = outer.document;

  // Block ad scripts
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => {
    const src = script.src?.toLowerCase() || '';
    if (
      src.includes('ads') ||
      src.includes('adserver') ||
      src.includes('doubleclick') ||
      src.includes('googlesyndication') ||
      src.includes('adservice') ||
      src.includes('pagead')
    ) {
      script.remove();
    }
  });
};

const blockAdIframes = () => {
  const doc = outer.document;

  const iframes = doc.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    if (iframe.id === 'haxreich-bot-iframe' || iframe.className === 'haxreich-bot-iframe') return; // SKIP OUR BOT

    const src = iframe.src?.toLowerCase() || '';
    if (
      src.includes('ads') ||
      src.includes('doubleclick') ||
      src.includes('googlesyndication') ||
      src.includes('adserver')
    ) {
      iframe.remove();
    }
  });
};

let adBlockerInitialized = false;

const initializeAdBlocker = () => {
  if (adBlockerInitialized) return;
  adBlockerInitialized = true;

  // Block immediately
  hideAds();
  blockAdScripts();
  blockAdIframes();

  // Observer to block new ads
  const observer = new MutationObserver(() => {
    hideAds();
    blockAdIframes();
  });

  observer.observe(outer.document.body, {
    childList: true,
    subtree: true,
  });

  // Repeat every 2 seconds as fallback
  setInterval(() => {
    hideAds();
    blockAdIframes();
  }, 2000);
};

export default function () {
  initializeAdBlocker();
}
