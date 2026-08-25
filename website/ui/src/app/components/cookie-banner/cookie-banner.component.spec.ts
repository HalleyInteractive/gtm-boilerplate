/**
 * @fileoverview unit tests for the CookieBannerComponent.
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
import type { Mock } from 'vitest';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Consent, ConsentStatus, ConsentUpdate } from 'src/app/models/consent';
import { ConsentService } from 'src/app/services/consent.service';
import { CookieBannerComponent } from './cookie-banner.component';

describe('CookieBannerComponent', () => {
    let component: CookieBannerComponent;
    let fixture: ComponentFixture<CookieBannerComponent>;

    beforeEach(async () => {
        const mockConsentService: {
            hasConsentCookie: Mock<() => boolean>;
            getCurrentConsent: Mock<() => Consent>;
            setCurrentConsent: Mock<(consent: ConsentUpdate) => void>;
        } = {
            hasConsentCookie: vi.fn().mockName("ConsentService.hasConsentCookie"),
            getCurrentConsent: vi.fn().mockName("ConsentService.getCurrentConsent"),
            setCurrentConsent: vi.fn().mockName("ConsentService.setCurrentConsent")
        };

        mockConsentService.getCurrentConsent.mockReturnValue({
            'ad_storage': ConsentStatus.DENIED,
            'ad_user_data': ConsentStatus.DENIED,
            'ad_personalization': ConsentStatus.DENIED,
            'analytics_storage': ConsentStatus.DENIED,
        } as Consent);

        await TestBed.configureTestingModule({
    imports: [ReactiveFormsModule, CookieBannerComponent],
    providers: [
        { provide: ConsentService, useValue: mockConsentService },
        FormBuilder,
    ],
}).compileComponents();

        fixture = TestBed.createComponent(CookieBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
