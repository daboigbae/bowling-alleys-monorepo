// Google Analytics integration for javascript_google_analytics blueprint

// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const isLocalDev = () =>
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

// Initialize Google Analytics — always define gtag so it's never undefined
export const initGA = () => {
  if (typeof window === 'undefined') return;
  if (isLocalDev()) return;

  // Define dataLayer and gtag immediately (no-op until GA script loads)
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) {
    return;
  }

  // Load Google Analytics script
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  window.gtag('js', new Date());
  window.gtag('config', measurementId);
};

// Track page views - useful for single-page applications
// Note: For SPA navigation, use the useAnalytics hook which waits for title updates
export const trackPageView = (url: string, title?: string) => {
  if (typeof window === 'undefined' || !window.gtag || isLocalDev()) return;
  
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url,
    page_title: title || document.title
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag || isLocalDev()) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track events with user identification
export const trackEventWithUser = (
  action: string,
  userId?: string,
  userEmail?: string,
  category?: string,
  label?: string,
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag || isLocalDev()) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    user_id: userId || 'anonymous',
    user_email: userEmail || undefined,
  });
};