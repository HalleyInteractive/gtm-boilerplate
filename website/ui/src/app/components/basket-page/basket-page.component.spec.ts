/**
 * @fileoverview unit tests for the BasketPageComponent.
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

import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { Basket, Product, ProductVariant, Products } from 'src/app/models/products';
import { BasketService } from 'src/app/services/basket.service';
import { EcommerceEventsService } from 'src/app/services/ecommerce-events.service';
import { ProductsService } from 'src/app/services/products.service';
import { BasketPageComponent } from './basket-page.component';

describe('BasketPageComponent', () => {
    let component: BasketPageComponent;
    let mockBasketService: {
        getBasket: Mock<() => Basket | undefined>;
        updateBasket: Mock<(product: Product, productVariant: ProductVariant, quantity: number) => void>;
        calculateTotalBasketPrice: Mock<() => number>;
    };
    let mockEcommerceEventsService: {
        sendBeginCheckoutEvent: Mock<(basket: Basket, value: number) => void>;
        sendAddToCartEvent: Mock<(product: Product, productVariant: ProductVariant, quantity?: number) => void>;
        sendRemoveFromCartEvent: Mock<(product: Product, productVariant: ProductVariant, quantity: number) => void>;
    };
    let mockProductsService: {
        products: Products;
    };

    beforeEach(async () => {
        mockBasketService = {
            getBasket: vi.fn().mockName("BasketService.getBasket"),
            updateBasket: vi.fn().mockName("BasketService.updateBasket"),
            calculateTotalBasketPrice: vi.fn().mockName("BasketService.calculateTotalBasketPrice")
        };
        mockEcommerceEventsService = {
            sendBeginCheckoutEvent: vi.fn().mockName("EcommerceEventsService.sendBeginCheckoutEvent"),
            sendAddToCartEvent: vi.fn().mockName("EcommerceEventsService.sendAddToCartEvent"),
            sendRemoveFromCartEvent: vi.fn().mockName("EcommerceEventsService.sendRemoveFromCartEvent")
        };
        mockProductsService = {
            products: {}
        };

        await TestBed.configureTestingModule({
    imports: [BasketPageComponent],
    providers: [
        { provide: BasketService, useValue: mockBasketService },
        {
            provide: EcommerceEventsService,
            useValue: mockEcommerceEventsService,
        },
        { provide: ProductsService, useValue: mockProductsService },
    ],
}).compileComponents();
    });

    beforeEach(() => {
        const fixture = TestBed.createComponent(BasketPageComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('sendBeginCheckoutEvent()', () => {
        it('should send the begin checkout event with basket and total price', () => {
            const mockBasket: Basket = {};
            const mockTotalPrice = 100;

            mockBasketService.getBasket.mockReturnValue(mockBasket);
            mockBasketService.calculateTotalBasketPrice.mockReturnValue(mockTotalPrice);

            component.sendBeginCheckoutEvent();

            expect(mockEcommerceEventsService.sendBeginCheckoutEvent).toHaveBeenCalledWith(mockBasket, mockTotalPrice);
        });

        it('should not send the event if the basket is empty', () => {
            mockBasketService.getBasket.mockReturnValue(undefined);

            component.sendBeginCheckoutEvent();

            expect(mockEcommerceEventsService.sendBeginCheckoutEvent).not.toHaveBeenCalled();
        });
    });
});
