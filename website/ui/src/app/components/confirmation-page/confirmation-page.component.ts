/**
 * @fileoverview this is the component for the confirmation page of the app.
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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import {Router} from '@angular/router';
import {Basket} from 'src/app/models/products';
import {BasketService} from 'src/app/services/basket.service';
import {EcommerceEventsService} from 'src/app/services/ecommerce-events.service';
import {ProductsService} from 'src/app/services/products.service';
import {v4 as uuidv4} from 'uuid';
import { KeyValuePipe } from '@angular/common';

/**
 * Confirmation page component.
 */
@Component({
    selector: 'app-confirmation-page',
    templateUrl: './confirmation-page.component.html',
    styleUrl: './confirmation-page.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [KeyValuePipe]
})
export class ConfirmationPageComponent implements OnInit {
  private router = inject(Router);
  basketService = inject(BasketService);
  productsService = inject(ProductsService);
  private ecommerceEventsService = inject(EcommerceEventsService);

  transactionId: string = uuidv4();

  ngOnInit(): void {
    this.basketService.clearBasketCookie();
    if (this.basketService.isBasketEmpty()) {
      this.router.navigate(['/products']);
    }
    this.ecommerceEventsService.sendPurchaseEvent(
      this.basketService.basket!,
      this.basketService.calculateTotalBasketPrice(false) as number,
      this.transactionId,
    );
  }

  /**
   * Get the contents of the basket.
   * @return the basket
   */
  getBasket(): Basket {
    // pull from the state without refreshing, as otherwise the basket will
    // appear empty
    if (this.basketService.basket !== undefined) {
      return this.basketService.basket;
    }
    return {};
  }
}
