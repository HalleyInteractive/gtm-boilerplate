/**
 * Copyright 2026 Google LLC
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

import { Component, OnInit, input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-tag-settings',
  templateUrl: './tag-settings.component.html',
  styleUrl: './tag-settings.component.css'
})
export class TagSettingsComponent implements OnInit {
  sidebarCollapsed = input<boolean>(false);
  settingsForm!: FormGroup;
  showOverlay = false;
  isLocalStorageEnabled = true;
  currentImplementationLabel = '';

  constructor(
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.isLocalStorageEnabled = this.checkLocalStorage();
    this.initForm();
  }

  private checkLocalStorage(): boolean {
    try {
      localStorage.setItem('__test_ls__', '1');
      localStorage.removeItem('__test_ls__');
      return true;
    } catch (e) {
      return false;
    }
  }

  private setImplementationLabel(library: string, enableGtg: boolean, gtgType: string): void {
    const libLabel = library === 'gtm' ? 'GTM' : 'Gtag';
    if (!enableGtg) {
      this.currentImplementationLabel = `${libLabel} | Standard`;
      return;
    }

    if (gtgType === 'server') {
      this.currentImplementationLabel = `${libLabel} | GTG via sGTM`;
    } else if (gtgType === 'cdn') {
      this.currentImplementationLabel = `${libLabel} | GTG via CDN`;
    } else if (gtgType === 'cdn-1click') {
      this.currentImplementationLabel = `${libLabel} | GTG via CDN (in UI)`;
    }
  }

  private initForm(): void {
    let storedTagType = 'gtm-default';
    let gtmContainerId = environment.gtmContainerId;
    let googleTagId = environment.googleTagId;
    let sgtmTagServingUrl = environment.sgtmTagServingUrl;
    let cdnTagServingUrl = environment.cdnTagServingUrl;
    let sgtmEndpointUrl = environment.sgtmEndpointUrl;

    if (this.isLocalStorageEnabled) {
      try {
        storedTagType = localStorage.getItem('tag-type') || 'gtm-default';
        gtmContainerId = localStorage.getItem('gtm-container-id') || environment.gtmContainerId;
        googleTagId = localStorage.getItem('google-tag-id') || environment.googleTagId;
        sgtmTagServingUrl = localStorage.getItem('sgtm-tag-serving-url') || environment.sgtmTagServingUrl;
        cdnTagServingUrl = localStorage.getItem('cdn-tag-serving-url') || environment.cdnTagServingUrl;
        sgtmEndpointUrl = localStorage.getItem('sgtm-endpoint-url') || environment.sgtmEndpointUrl;
      } catch (e) {
        this.isLocalStorageEnabled = false;
      }
    }


    let library = 'gtm';
    let enableGtg = false;
    let gtgType = 'server';

    if (storedTagType.startsWith('gtag')) {
      library = 'gtag';
    } else {
      library = 'gtm';
    }

    if (storedTagType.includes('-gtg-')) {
      enableGtg = true;
      if (storedTagType.endsWith('via-cdn')) {
        const hasCustomCdnCookie = this.isLocalStorageEnabled && localStorage.getItem('cdn-tag-serving-url') !== null;
        if (hasCustomCdnCookie) {
          gtgType = 'cdn';
        } else {
          gtgType = 'cdn-1click';
        }
      } else {
        gtgType = 'server';
      }
    }

    this.setImplementationLabel(library, enableGtg, gtgType);

    this.settingsForm = this.fb.group({
      library: [library],
      enableGtg: [enableGtg],
      gtgType: [gtgType],
      gtmContainerId: [gtmContainerId],
      googleTagId: [googleTagId],
      sgtmTagServingUrl: [sgtmTagServingUrl],
      cdnTagServingUrl: [cdnTagServingUrl],
      sgtmEndpointUrl: [sgtmEndpointUrl]
    });
  }

  toggleSettings(): void {
    this.showOverlay = !this.showOverlay;
  }

  saveSettings(): void {
    const formValue = this.settingsForm.value;

    let tagType = 'gtm-default';
    if (formValue.library === 'gtag') {
      if (formValue.enableGtg) {
        tagType = formValue.gtgType.startsWith('cdn') ? 'gtag-gtg-via-cdn' : 'gtag-gtg-via-sgtm';
      } else {
        tagType = 'gtag-default';
      }
    } else {
      if (formValue.enableGtg) {
        tagType = formValue.gtgType.startsWith('cdn') ? 'gtm-gtg-via-cdn' : 'gtm-gtg-via-sgtm';
      } else {
        tagType = 'gtm-default';
      }
    }

    localStorage.setItem('tag-type', tagType);
    localStorage.setItem('gtm-container-id', formValue.gtmContainerId);
    localStorage.setItem('google-tag-id', formValue.googleTagId);
    localStorage.setItem('sgtm-tag-serving-url', formValue.sgtmTagServingUrl);
    localStorage.setItem('sgtm-endpoint-url', formValue.sgtmEndpointUrl);

    if (formValue.gtgType === 'cdn') {
      localStorage.setItem('cdn-tag-serving-url', formValue.cdnTagServingUrl);
    } else {
      localStorage.removeItem('cdn-tag-serving-url');
    }

    window.location.reload();
  }

  resetSettings(): void {
    localStorage.removeItem('tag-type');
    localStorage.removeItem('gtm-container-id');
    localStorage.removeItem('google-tag-id');
    localStorage.removeItem('sgtm-tag-serving-url');
    localStorage.removeItem('cdn-tag-serving-url');
    localStorage.removeItem('sgtm-endpoint-url');

    window.location.reload();
  }
}
