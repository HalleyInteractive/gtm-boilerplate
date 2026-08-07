/**
 * @fileoverview A service to manage user login/logouts in the app.
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
import {Inject, Injectable} from '@angular/core';
import {CookieService} from 'ngx-cookie-service';
import {User} from '../models/user';

/**
 * A service to manage user login/logouts in the app.
 */
@Injectable({
  providedIn: 'root',
})
export class LoginService {
  isLoggedIn = false;
  user: User;

  private cookieName = 'login-cookie';
  private cookieExpiryDays = 365;
  private nullUser: User = {
    id: null,
    name: null,
    email: null,
    sha256_email_address: null,
    phone_number: null,
    sha256_phone_number: null,
    address: {
      first_name: null,
      sha256_first_name: null,
      last_name: null,
      sha256_last_name: null,
      street: null,
      city: null,
      region: null,
      postal_code: null,
      country: null,
    }
  };
  private defaultUser: User = {
    id: '1',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    sha256_email_address: '86e0b9e56c17cc4d12387e1949b85053fbe73bc3ce5a1188713a9d300cc6133d',
    phone_number: '+15555555555',
    sha256_phone_number: '910a625c4ba147b544e6bd2f267e130ae14c591b6ba9c25cb8573322dedbebd0',
    address: {
      first_name: 'Jane',
      sha256_first_name: '81f8f6dde88365f3928796ec7aa53f72820b06db8664f5fe76a7eb13e24546a2',
      last_name: 'Doe',
      sha256_last_name: '799ef92a11af918e3fb741df42934f3b568ed2d93ac1df74f1b8d41a27932a6f',
      street: '1600 Amphitheatre Pkwy',
      city: 'Mountain View',
      region: 'CA',
      postal_code: '94043',
      country: 'US',
    }
  };
  // The datalayer is set in index.html so it is always present.
  // Using any as the content of the datalayer is externally managed by GTM.
  private dataLayer!: any[];

  constructor(
    private cookieService: CookieService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.user = this.getUserFromCookie();
    this.getDataLayerFromPage();
  }

  /**
   * Pull the datalayer from the page.
   */
  private getDataLayerFromPage(): void {
    const defaultView = this.document.defaultView;
    if (defaultView != null && 'dataLayer' in defaultView) {
      this.dataLayer = defaultView.dataLayer as any[];
    }
  }

  /**
   * Log in a user.
   * @param user the user to login
   */
  logUserIn(user: User): void {
    this.user = user;
    this.setUserInDataLayer(user);
    this.isLoggedIn = true;
    this.setUserInCookie();
  }

  /**
   * Set a user in the datalayer.
   * @param user the user to login.
   */
  setUserInDataLayer(user: User): void {
    if (user !== undefined) {
      this.dataLayer.push({
        user,
      });
    }
  }

  /**
   * Log out a user.
   */
  logUserOut(): void {
    this.isLoggedIn = false;
    this.cookieService.delete(this.cookieName);
    this.setUserInDataLayer(this.nullUser);
  }

  /**
   * Set the user in the cookie for persistence.
   */
  private setUserInCookie(): void {
    const expiryDate = new Date();
    expiryDate.setTime(
      expiryDate.getTime() + this.cookieExpiryDays * 24 * 60 * 60 * 1000,
    );
    this.cookieService.set(
      this.cookieName,
      JSON.stringify(this.user),
      expiryDate,
    );
  }

  /**
   * Get the user from the cookie.
   * @returns the user based on what's stored in the cookie
   */
  private getUserFromCookie(): User {
    const loginCookie = this.cookieService.get(this.cookieName);
    // Cookie has not been set - return defaults
    if (loginCookie === '') {
      return this.nullUser;
    } else {
      const user: User = JSON.parse(loginCookie);
      
      // Clean up legacy flat address fields from old cookies
      const legacyUser = { ...user } as any;
      delete legacyUser.first_name;
      delete legacyUser.last_name;
      delete legacyUser.street;
      delete legacyUser.city;
      delete legacyUser.region;
      delete legacyUser.postal_code;
      delete legacyUser.country;

      // Discard legacy formatted phone numbers and their incorrect hashes
      if (
        legacyUser.phone_number &&
        (legacyUser.phone_number.includes(' ') || legacyUser.phone_number.includes('-'))
      ) {
        delete legacyUser.phone_number;
        delete legacyUser.sha256_phone_number;
      }
      
      this.isLoggedIn = true;
      return {
        ...this.defaultUser,
        ...legacyUser
      };
    }
  }
}
