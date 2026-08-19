import { environment } from '../environments/environment';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

function isGoogleTagManagerHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr, window.location.origin);
    return parsed.hostname === 'www.googletagmanager.com' || parsed.hostname === 'googletagmanager.com';
  } catch {
    return false;
  }
}

export function loadGtmScripts(): void {
  let tagType: string | null = null;
  let gtmContainerId = environment.gtmContainerId;
  let googleTagId = environment.googleTagId;
  let sgtmTagServingUrl = environment.sgtmTagServingUrl;
  let cdnTagServingUrl = 'https://www.googletagmanager.com';
  let sgtmEndpointUrl = environment.sgtmEndpointUrl;

  try {
    tagType = localStorage.getItem('tag-type');
    gtmContainerId = localStorage.getItem('gtm-container-id') || environment.gtmContainerId;
    googleTagId = localStorage.getItem('google-tag-id') || environment.googleTagId;

    if (tagType?.startsWith('gtag')) {
      sgtmTagServingUrl = localStorage.getItem('gtag-sgtm-tag-serving-url')
        || localStorage.getItem('sgtm-tag-serving-url')
        || environment.sgtmTagServingUrl;
      cdnTagServingUrl = localStorage.getItem('gtag-cdn-tag-serving-url')
        || localStorage.getItem('cdn-tag-serving-url')
        || 'https://www.googletagmanager.com';
      sgtmEndpointUrl = localStorage.getItem('gtag-sgtm-endpoint-url')
        || localStorage.getItem('sgtm-endpoint-url')
        || environment.sgtmEndpointUrl;
    } else {
      sgtmTagServingUrl = localStorage.getItem('gtm-sgtm-tag-serving-url')
        || localStorage.getItem('sgtm-tag-serving-url')
        || environment.sgtmTagServingUrl;
      cdnTagServingUrl = localStorage.getItem('gtm-cdn-tag-serving-url')
        || localStorage.getItem('cdn-tag-serving-url')
        || 'https://www.googletagmanager.com';
    }
  } catch (e) {
    console.warn('⚠️ Google Tag / GTM tracking is running on default configuration because localStorage is disabled/inaccessible in this browser.', e);
  }

  let loadGtag = false;
  let scriptDomain = 'https://www.googletagmanager.com';
  let enableSgtmTransport = false;

  switch (tagType) {
    case 'gtm-gtg-via-sgtm':
      loadGtag = false;
      scriptDomain = sgtmTagServingUrl;
      break;

    case 'gtm-gtg-via-cdn':
      loadGtag = false;
      scriptDomain = cdnTagServingUrl;
      break;

    case 'gtag-gtg-via-sgtm':
      loadGtag = true;
      scriptDomain = sgtmTagServingUrl;
      enableSgtmTransport = true;
      break;

    case 'gtag-gtg-via-cdn':
      loadGtag = true;
      scriptDomain = cdnTagServingUrl;
      enableSgtmTransport = true;
      break;

    case 'gtag-default':
      loadGtag = true;
      scriptDomain = 'https://www.googletagmanager.com';
      break;

    case 'gtm-default':
    default:
      loadGtag = false;
      scriptDomain = 'https://www.googletagmanager.com';
      break;
  }

  if (loadGtag) {
    const libScript = document.createElement('script');
    libScript.async = true;
    if (isGoogleTagManagerHost(scriptDomain)) {
      libScript.src = `${scriptDomain}/gtag/js?id=${googleTagId}`;
    } else {
      libScript.src = `${scriptDomain}`;
    }
    document.head.insertBefore(libScript, document.head.firstChild);

    const configScript = document.createElement('script');

    const configParams: any = {};
    if (enableSgtmTransport) {
      configParams.server_container_url = sgtmEndpointUrl;
    }

    const scriptContent = [
      `window.dataLayer = window.dataLayer || [];`,
      `function gtag(){dataLayer.push(arguments);}`,
      `gtag('js', new Date());`,
      `gtag('config', '${googleTagId}', ${JSON.stringify(configParams)});`
    ].join('\n');

    configScript.textContent = scriptContent;

    if (libScript.parentNode) {
      libScript.parentNode.insertBefore(configScript, libScript.nextSibling);
    }

  } else {
    (function (w: any, d: Document, s: string, l: string, i: string) {
      w[l] = w[l] || [];
      w[l].push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      });
      const f = d.getElementsByTagName(s)[0];
      const j = d.createElement(s) as HTMLScriptElement;
      const dl = l !== 'dataLayer' ? '&l=' + l : '';
      j.async = true;
      if (isGoogleTagManagerHost(scriptDomain)) {
        j.src = `${scriptDomain}/gtm.js?id=${i}${dl}`;
      } else {
        j.src = `${scriptDomain}/${dl}`;
      }
      if (f && f.parentNode) {
        f.parentNode.insertBefore(j, f);
      }
    })(window, document, 'script', 'dataLayer', gtmContainerId);
  }
}
