import { outer } from '@/core/outer.js';

const AD_SELECTORS = [
  // Pubs vidéo
  '#ad-block',
  '#ad-container',
  '#video-ad',
  '.ad-container',
  '.video-ad',
  // Bannières
  '.ad-banner',
  '.ad-unit',
  '.ad-placement',
  // Google Ads
  'ins.adsbygoogle',
  '[id^="google_ads"]',
  '[id^="div-gpt-ad"]',
  // Autres
  '.sponsored',
  '.advertisement',
  '#ad-bottom',
  '#ad-top',
  '#ad-side',
  // Survev spécifique
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

  // Bloquer les scripts de pub
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

let initialized = false;

export default function () {
  if (initialized) return;
  initialized = true;

  // Bloquer immédiatement
  hideAds();
  blockAdScripts();
  blockAdIframes();

  // Observer pour bloquer les nouvelles pubs
  const observer = new MutationObserver(() => {
    hideAds();
    blockAdIframes();
  });

  observer.observe(outer.document.body, {
    childList: true,
    subtree: true,
  });

  // Répéter toutes les 2 secondes au cas où
  setInterval(() => {
    hideAds();
    blockAdIframes();
  }, 2000);
}