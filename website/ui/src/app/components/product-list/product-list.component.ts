/**
 * @fileoverview this is the component for the product list.
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
import {BasketService} from 'src/app/services/basket.service';
import {ProductsService} from 'src/app/services/products.service';
import {EcommerceEventsService} from 'src/app/services/ecommerce-events.service';
import {Product} from 'src/app/models/products';
import { RouterLink } from '@angular/router';
import { KeyValuePipe } from '@angular/common';

/**
 * Product List Component
 */
@Component({
    selector: 'app-product-list',
    templateUrl: './product-list.component.html',
    styleUrls: ['./product-list.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterLink, KeyValuePipe]
})
export class ProductListComponent {
  productsService = inject(ProductsService);
  basketService = inject(BasketService);
  private ecommerceEventsService = inject(EcommerceEventsService);

  /**
   * Sends the 'select_item' event when a product is clicked.
   * @param product The product that was clicked.
   */
  selectItem(product: Product): void {
    const productVariant =
      this.productsService.getDefaultProductVariant(product);
    this.ecommerceEventsService.sendSelectItemEvent(product, productVariant);
  }
}
