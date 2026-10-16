/**
 * @fileoverview Unit tests for the NewsletterPageComponent.
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import type { Mock } from 'vitest';
import { EcommerceEventsService } from 'src/app/services/ecommerce-events.service';
import { NewsletterPageComponent } from './newsletter-page.component';

describe('NewsletterPageComponent', () => {
  let component: NewsletterPageComponent;
  let fixture: ComponentFixture<NewsletterPageComponent>;
  let mockEcommerceEventsService: {
    sendNewsletterSignupEvent: Mock<(name: string, email: string) => void>;
  };

  beforeEach(async () => {
    mockEcommerceEventsService = {
      sendNewsletterSignupEvent: vi.fn().mockName('EcommerceEventsService.sendNewsletterSignupEvent'),
    };

    await TestBed.configureTestingModule({
      imports: [NewsletterPageComponent, RouterTestingModule],
      providers: [
        { provide: EcommerceEventsService, useValue: mockEcommerceEventsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsletterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the newsletter component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with an empty and invalid form', () => {
    expect(component.newsletterForm.valid).toBe(false);
    expect(component.isSubmitted).toBe(false);
  });

  it('should not submit or send event if form is invalid', () => {
    component.newsletterForm.setValue({
      name: '',
      email: 'invalid-email',
    });

    component.onSubmit();

    expect(mockEcommerceEventsService.sendNewsletterSignupEvent).not.toHaveBeenCalled();
    expect(component.isSubmitted).toBe(false);
  });

  it('should send newsletter_signup event and set isSubmitted when form is valid', () => {
    component.newsletterForm.setValue({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    component.onSubmit();

    expect(mockEcommerceEventsService.sendNewsletterSignupEvent).toHaveBeenCalledWith(
      'Jane Doe',
      'jane@example.com'
    );
    expect(component.isSubmitted).toBe(true);
    expect(component.subscriberName).toBe('Jane Doe');
    expect(component.subscriberEmail).toBe('jane@example.com');
  });

  it('should reset form state when resetForm is called', () => {
    component.isSubmitted = true;
    component.subscriberName = 'Jane';
    component.subscriberEmail = 'jane@example.com';

    component.resetForm();

    expect(component.isSubmitted).toBe(false);
    expect(component.subscriberName).toBe('');
    expect(component.subscriberEmail).toBe('');
  });
});
