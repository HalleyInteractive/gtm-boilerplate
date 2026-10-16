/**
 * @fileoverview the main app component for the application.
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
import { NgClass } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import {ConsentService} from './services/consent.service';
import {TopBarComponent} from './components/top-bar/top-bar.component';
import {CookieBannerComponent} from './components/cookie-banner/cookie-banner.component';
import {EventStreamComponent} from './components/event-stream/event-stream.component';

/** The route app component */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
      NgClass,
      RouterOutlet,
      TopBarComponent,
      CookieBannerComponent,
      EventStreamComponent,
    ]
})
export class AppComponent {
  private consentService = inject(ConsentService);

  showSidebar = true;

  /**
   * Turn the sidebar on or off
   */
  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }
}
