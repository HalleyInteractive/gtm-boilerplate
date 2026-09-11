/**
 * @fileoverview this is the component for the tag source switcher.
 * It shows where gtm.js was loaded from and lets you reload the page against
 * the other route, which is useful for comparing first-party Google Tag Gateway
 * serving against loading directly from googletagmanager.com.
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

import {DOCUMENT} from '@angular/common';
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {appEnv, TagSource} from 'src/app/app-env';

/** Query parameter read by the tag source script in index.html. */
export const TAG_SOURCE_PARAM = 'tagsrc';

/** Session storage key used by the tag source script in index.html. */
export const TAG_SOURCE_STORAGE_KEY = 'gtm_tagsrc';

/**
 * Tag Source Component
 */
@Component({
    selector: 'app-tag-source',
    templateUrl: './tag-source.component.html',
    styleUrl: './tag-source.component.css',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class TagSourceComponent {
  private document = inject(DOCUMENT);

  /** The tag source used for the current page load. */
  get active(): TagSource {
    return appEnv(this.document.defaultView).TAG_SOURCE ?? 'google';
  }

  /** The base URL gtm.js was loaded from. */
  get base(): string {
    return appEnv(this.document.defaultView).TAG_BASE ?? '';
  }

  /** The edge route, or '' when no reverse proxy is in front of the app. */
  get edgePath(): string {
    return appEnv(this.document.defaultView).EDGE_PATH ?? '';
  }

  /**
   * Whether the gateway route can be used. It is unavailable under `ng serve`,
   * where nothing proxies the measurement path.
   * @return true when an edge route is configured.
   */
  get gatewayAvailable(): boolean {
    return this.edgePath !== '';
  }

  /**
   * Whether the current source came from an explicit choice rather than the
   * deployment default.
   * @return true when an override is stored for this tab.
   */
  get overridden(): boolean {
    return this.storedOverride() !== null;
  }

  /**
   * Build the URL that loads the current page using the given tag source.
   * @param source the tag source to switch to.
   * @return the absolute URL to navigate to.
   */
  urlFor(source: TagSource): string {
    const href = this.document.defaultView?.location.href ?? '';
    const url = new URL(href);
    url.searchParams.set(TAG_SOURCE_PARAM, source);
    return url.toString();
  }

  /**
   * Switch to the given tag source.
   * gtm.js is loaded once in the document head, so the page must be reloaded
   * rather than routed for the change to take effect.
   * @param source the tag source to switch to.
   */
  select(source: TagSource): void {
    if (source === this.active) {
      return;
    }
    if (source === 'gateway' && !this.gatewayAvailable) {
      return;
    }
    this.document.defaultView?.location.assign(this.urlFor(source));
  }

  /**
   * Drop the stored override and reload using the deployment default.
   */
  reset(): void {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    try {
      view.sessionStorage.removeItem(TAG_SOURCE_STORAGE_KEY);
    } catch {
      // sessionStorage can throw when cookies are blocked; the URL still wins.
    }
    const url = new URL(view.location.href);
    url.searchParams.delete(TAG_SOURCE_PARAM);
    view.location.assign(url.toString());
  }

  /**
   * Read the override stored for this tab.
   * @return the stored source, or null when there is none.
   */
  private storedOverride(): TagSource | null {
    try {
      const stored = this.document.defaultView?.sessionStorage.getItem(
        TAG_SOURCE_STORAGE_KEY,
      );
      return stored === 'google' || stored === 'gateway' ? stored : null;
    } catch {
      // sessionStorage can throw when cookies are blocked.
      return null;
    }
  }
}
