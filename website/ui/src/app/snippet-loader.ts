/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { environment } from '../environments/environment';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

/**
 * Standard Google Tag Manager snippet loader.
 * Loads gtm.js either from the configured measurement edge path or directly from Google Tag Manager.
 */
export function loadGtmScripts(): void {
  window.dataLayer = window.dataLayer || [];

  const gtmContainerId = environment.gtmContainerId;
  if (!gtmContainerId || gtmContainerId === 'GTM-XXXXX') {
    return;
  }

  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  let basePath = environment.measurementPath || 'https://www.googletagmanager.com';
  basePath = basePath.replace(/\/+$/, '');

  const script = document.createElement('script');
  script.async = true;
  script.src = `${basePath}/gtm.js?id=${gtmContainerId}`;

  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
}

