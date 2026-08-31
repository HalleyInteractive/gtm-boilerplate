/**
 * @fileoverview the default environment variables used in the project.
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

export const environment = {
  production: false,
  // This is the currency used for all products and tagging/conversions
  currency: 'GBP',
  // This is the ISO_639 language code and the ISO_3166-1 Alpha 2 country code.
  localCode: 'en-GB',
  // The ID of the container in Google Tag Manager, e.g. GTM-XXXXXXXX
  gtmContainerId: 'GTM-KDFCRJM5',
  // The base path or URL used to load GTM scripts and collect data.
  // Set to a relative edge route (e.g. '/d4t4') or full URL (e.g. 'https://www.googletagmanager.com')
  measurementPath: '/d4t4',
};
