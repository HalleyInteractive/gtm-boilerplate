/**
 * @fileoverview a service for managing the user's consent with GTM.
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


import { Injectable, DOCUMENT, inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject } from 'rxjs';
import { Consent, ConsentStatus, ConsentUpdate } from '../models/consent';

export type GtagFn = (...args: unknown[]) => void;

/**
 * A service for managing the user's consent with GTM.
 */
@Injectable({
  providedIn: 'root',
})
export class ConsentService {
  private cookieService = inject(CookieService);
  private document = inject<Document>(DOCUMENT);
  private injectedGtag = inject<GtagFn>('gtag' as never, { optional: true });

  // Set the default consent to denied
  private currentConsent: Consent = {
    'ad_storage': ConsentStatus.DENIED,
    'ad_user_data': ConsentStatus.DENIED,
    'ad_personalization': ConsentStatus.DENIED,
    'analytics_storage': ConsentStatus.DENIED,
  };
  private cookieName = 'consent-cookie';
  private cookieExpiryDays = 365;

  gtag!: GtagFn;
  isInitialized = new BehaviorSubject<boolean>(false);
  hasConsentCookie = false;

  constructor() {
    this.initialize();
  }

  /**
   * Set the service up to be ready for use.
   * Set the initial consent to denied, check to see if the cookie has been set
   * with the user's preferences, and if so send an update.
   */
  private initialize(): void {
    if (!this.injectedGtag) {
      this.getGtagFromPage();
    } else {
      this.gtag = this.injectedGtag;
    }
    this.getConsentFromCookie();
    this.isInitialized.next(true);
  }

  /**
   * Get the current consent.
   */
  getCurrentConsent(): Consent {
    return this.currentConsent;
  }

  /**
   * Set the current consent status, and ensure cookie and tagging are updated.
   * @param consent the new consent
   */
  setCurrentConsent(consent: Consent): void {
    this.currentConsent = consent;
    this.updateGtagConsent(ConsentUpdate.UPDATE);
    this.setConsentCookie();
  }

  /**
   * Pull the gTag function from the page and set the service attribute.
   */
  private getGtagFromPage(): void {
    const defaultView = this.document.defaultView as (Window & { gtag?: GtagFn }) | null;
    if (defaultView != null && typeof defaultView.gtag === 'function') {
      this.gtag = defaultView.gtag;
    }
  }

  /**
  * Update the consent settings in Google Tag Manager.
  * @param consentUpdate: the type of consent update to apply, e.g. default
  */
  private updateGtagConsent(consentUpdate: ConsentUpdate): void {
    // FIX: Check if this.gtag is defined (truthy), DO NOT call it with ()
    if (this.gtag) {
      this.gtag('consent', consentUpdate, this.currentConsent);
    } else {
      console.error('gtag has not been assigned.');
    }
  }

  /**
   * Check the cookie to see if the consent has been set previously.
   */
  private getConsentFromCookie(): void {
    const consentCookie = this.cookieService.get(this.cookieName);
    if (consentCookie === '') {
      this.hasConsentCookie = false;
    } else {
      this.hasConsentCookie = true;
      const consent: Consent = JSON.parse(consentCookie);
      console.log('You have a cookie set with these preferences:', consent);
      this.currentConsent = consent;
    }
  }

  private setConsentCookie(): void {
    const expiryDate = new Date();
    expiryDate.setTime(
      expiryDate.getTime() + this.cookieExpiryDays * 24 * 60 * 60 * 1000,
    );
    this.cookieService.set(
      this.cookieName,
      JSON.stringify(this.currentConsent),
      expiryDate,
    );
  }
}


