/**
 * @fileoverview Component for the Newsletter Signup page.
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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EcommerceEventsService } from 'src/app/services/ecommerce-events.service';

/**
 * Newsletter Page Component.
 */
@Component({
  selector: 'app-newsletter-page',
  templateUrl: './newsletter-page.component.html',
  styleUrls: ['./newsletter-page.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, RouterLink],
})
export class NewsletterPageComponent {
  private ecommerceEventsService = inject(EcommerceEventsService);

  isSubmitted = false;
  subscriberName = '';
  subscriberEmail = '';

  newsletterForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  /**
   * Handle newsletter form submission.
   */
  onSubmit(): void {
    if (this.newsletterForm.invalid) {
      this.newsletterForm.markAllAsTouched();
      return;
    }

    const { name, email } = this.newsletterForm.getRawValue();
    this.subscriberName = name;
    this.subscriberEmail = email;

    this.ecommerceEventsService.sendNewsletterSignupEvent(name, email);
    this.isSubmitted = true;
    this.newsletterForm.reset();
  }

  /**
   * Reset form state to allow another signup.
   */
  resetForm(): void {
    this.isSubmitted = false;
    this.subscriberName = '';
    this.subscriberEmail = '';
    this.newsletterForm.reset();
  }
}
