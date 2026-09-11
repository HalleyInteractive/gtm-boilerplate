/**
 * @fileoverview typed access to the runtime configuration that index.html
 * publishes on `window.__APP_ENV__`.
 *
 * Values are injected into index.html at container startup, or resolved by the
 * tag source script in the document head. They are not available at build time.
 *
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

/** Where gtm.js is loaded from. */
export type TagSource = 'google' | 'gateway';

/** Runtime configuration published by index.html. */
export interface AppEnv {
  /** Hosting platform label, injected at container startup. */
  PLATFORM_NAME?: string;
  /** Google Tag Gateway edge route, injected at container startup. */
  MEASUREMENT_PATH?: string;
  /** The tag source resolved for this page load. */
  TAG_SOURCE?: TagSource;
  /** Base URL that gtm.js was loaded from. */
  TAG_BASE?: string;
  /** Usable edge route, or '' when no reverse proxy is in front of the app. */
  EDGE_PATH?: string;
  /** True when a value is still an unsubstituted `__APP_*__` placeholder. */
  isPlaceholder?: (value?: string) => boolean;
}

declare global {
  interface Window {
    __APP_ENV__?: AppEnv;
  }
}

/**
 * Read the runtime configuration.
 * @param win the window to read from, if any.
 * @return the configuration, or an empty object when it is unavailable.
 */
export function appEnv(win: Window | null): AppEnv {
  return win?.__APP_ENV__ ?? {};
}
