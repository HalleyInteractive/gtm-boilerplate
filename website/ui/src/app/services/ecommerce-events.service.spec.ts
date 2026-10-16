/**
 * @fileoverview unit tests for the EcommerceEventsService.
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

import {TestBed} from '@angular/core/testing';

import {EcommerceEventsService} from './ecommerce-events.service';

describe('EcommerceEventsService', () => {
  let service: EcommerceEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EcommerceEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendNewsletterSignupEvent()', () => {
    it('should push newsletter_signup event to dataLayer and prepend to events list', () => {
      const initialEventsLength = service.events.length;

      service.sendNewsletterSignupEvent('Jane Doe', 'jane@example.com');

      expect(service.events.length).toBe(initialEventsLength + 1);
      expect(service.events[0]).toContain('newsletter_signup');
      expect(service.events[0]).toContain('Jane Doe');
      expect(service.events[0]).toContain('jane@example.com');
    });
  });
});
