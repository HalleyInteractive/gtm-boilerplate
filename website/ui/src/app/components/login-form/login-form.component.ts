/**
 * @fileoverview this is the component for the login form.
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

import { Component, OnInit, ElementRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {LoginService} from 'src/app/services/login.service';
import { NgClass } from '@angular/common';

/**
 * Login form component.
 */
@Component({
    selector: 'app-login-form',
    templateUrl: './login-form.component.html',
    styleUrl: './login-form.component.css',
    host: {
        '(document:click)': 'onDocumentClick($event)'
    },
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [NgClass, FormsModule, ReactiveFormsModule]
})
export class LoginFormComponent implements OnInit {
  loginService = inject(LoginService);
  private elementRef = inject(ElementRef);

  showOverlay = false;
  showDetails = false;
  userForm: FormGroup = new FormGroup({});;

  ngOnInit(): void {
    // Initialize form with user data (if available)
    this.userForm = new FormGroup({
      id: new FormControl(this.loginService.user.id || '1'),
      first_name: new FormControl(
        this.loginService.user.address?.first_name || 'Jane',
      ),
      last_name: new FormControl(
        this.loginService.user.address?.last_name || 'Doe',
      ),
      email: new FormControl(
        this.loginService.user.email || 'jane.doe@example.com',
      ),
      phone_number: new FormControl(
        this.loginService.user.phone_number || '+15555555555',
      ),
      street: new FormControl(
        this.loginService.user.address?.street || '1600 Amphitheatre Pkwy',
      ),
      city: new FormControl(
        this.loginService.user.address?.city || 'Mountain View',
      ),
      region: new FormControl(
        this.loginService.user.address?.region || 'CA',
      ),
      postal_code: new FormControl(
        this.loginService.user.address?.postal_code || '94043',
      ),
      country: new FormControl(
        this.loginService.user.address?.country || 'US',
      ),
    });
    this.loginService.setUserInDataLayer(this.loginService.user);
  }

  /**
   * Toggle the details dropdown.
   */
  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  /**
   * Helper to hash a value using SHA-256 in the browser.
   */
  private async hashValue(val: string | null | undefined): Promise<string | null> {
    if (!val) return null;
    const msgBuffer = new TextEncoder().encode(val.trim().toLowerCase());
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Log the user in.
   */
  async login(): Promise<void> {
    const formValue = this.userForm.value;
    formValue.name = `${formValue.first_name} ${formValue.last_name}`;

    // Hash email and phone
    formValue.sha256_email_address = await this.hashValue(formValue.email);
    formValue.sha256_phone_number = await this.hashValue(formValue.phone_number);

    // Nest address properties and hash first/last name
    formValue.address = {
      first_name: formValue.first_name,
      sha256_first_name: await this.hashValue(formValue.first_name),
      last_name: formValue.last_name,
      sha256_last_name: await this.hashValue(formValue.last_name),
      street: formValue.street,
      city: formValue.city,
      region: formValue.region,
      postal_code: formValue.postal_code,
      country: formValue.country,
    };

    // Remove flat properties from user object root
    delete formValue.first_name;
    delete formValue.last_name;
    delete formValue.street;
    delete formValue.city;
    delete formValue.region;
    delete formValue.postal_code;
    delete formValue.country;

    this.loginService.logUserIn(formValue);
    this.showOverlay = false;
  }

  /**
   * Log the user out.
   */
  logout(): void {
    this.loginService.logUserOut();
  }

  /**
   * Toggle the login form.
   */
  toggleOverlay(): void {
    this.showOverlay = !this.showOverlay;
  }

  /**
   * Close dropdown if clicked outside.
   */
  onDocumentClick(event: MouseEvent): void {
    if (!this.showDetails) {
      return;
    }
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.showDetails = false;
    }
  }
}
