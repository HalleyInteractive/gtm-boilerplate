/**
 * @fileoverview unit tests for the ConfirmationPageComponent.
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
import { Basket, Product, ProductVariant } from 'src/app/models/products';
import { BasketService } from 'src/app/services/basket.service';
import { EcommerceEventsService } from 'src/app/services/ecommerce-events.service';
import { ProductsService } from 'src/app/services/products.service';
import { ConfirmationPageComponent } from './confirmation-page.component';

describe('ConfirmationPageComponent', () => {
    let component: ConfirmationPageComponent;
    let fixture: ComponentFixture<ConfirmationPageComponent>;
    let mockBasketService: {
        clearBasketCookie: Mock<() => void>;
        isBasketEmpty: Mock<() => boolean>;
        calculateTotalBasketPrice: Mock<() => number>;
    };
    let mockEcommerceEventsService: {
        sendPurchaseEvent: Mock<(basket: Basket, value: number, transaction_id: string, shippingTier?: string, paymentType?: string) => void>;
    };
    let mockProductsService: {
        getProductVariantPriceAsCurrency: Mock<(product: Product, productVariant: ProductVariant) => string>;
    };

    beforeEach(async () => {
        // Create mock services with spies
        mockBasketService = {
            clearBasketCookie: vi.fn().mockName("BasketService.clearBasketCookie"),
            isBasketEmpty: vi.fn().mockName("BasketService.isBasketEmpty"),
            calculateTotalBasketPrice: vi.fn().mockName("BasketService.calculateTotalBasketPrice")
        };
        mockEcommerceEventsService = {
            sendPurchaseEvent: vi.fn().mockName("EcommerceEventsService.sendPurchaseEvent")
        };
        mockProductsService = {
            getProductVariantPriceAsCurrency: vi.fn().mockName("ProductsService.getProductVariantPriceAsCurrency")
        };

        mockBasketService.isBasketEmpty.mockReturnValue(false);

        await TestBed.configureTestingModule({
    imports: [ConfirmationPageComponent],
    providers: [
        { provide: BasketService, useValue: mockBasketService },
        { provide: EcommerceEventsService, useValue: mockEcommerceEventsService },
        { provide: ProductsService, useValue: mockProductsService },
    ],
}).compileComponents();

        fixture = TestBed.createComponent(ConfirmationPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
