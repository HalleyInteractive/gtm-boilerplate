/**
 * @fileoverview unit tests for the TagSourceComponent.
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

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AppEnv} from 'src/app/app-env';

import {
  TAG_SOURCE_STORAGE_KEY,
  TagSourceComponent,
} from './tag-source.component';

describe('TagSourceComponent', () => {
  let component: TagSourceComponent;
  let fixture: ComponentFixture<TagSourceComponent>;
  let assigned: string[];

  /**
   * Replace the values index.html would have published, and capture navigation
   * instead of actually reloading the test page.
   * @param env the runtime configuration to expose.
   * @param href the current page URL.
   */
  function setEnv(env: AppEnv, href = 'https://example.test/products?q=shoe') {
    assigned = [];
    const view = {
      __APP_ENV__: env,
      location: {
        href,
        assign: (url: string) => assigned.push(url),
      },
      sessionStorage: window.sessionStorage,
    };
    // The component reads the injected document, so stub that rather than the
    // real window, whose location cannot be reassigned.
    Object.defineProperty(component, 'document', {
      value: {defaultView: view},
      writable: true,
    });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagSourceComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TagSourceComponent);
    component = fixture.componentInstance;
    window.sessionStorage.removeItem(TAG_SOURCE_STORAGE_KEY);
    fixture.detectChanges();
  });

  afterEach(() => {
    window.sessionStorage.removeItem(TAG_SOURCE_STORAGE_KEY);
    delete window.__APP_ENV__;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the active route and the resolved script URL', () => {
    window.__APP_ENV__ = {
      TAG_SOURCE: 'gateway',
      TAG_BASE: '/d4t4',
      EDGE_PATH: '/d4t4',
    };
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    const buttons = host.querySelectorAll<HTMLButtonElement>(
      '.tag-source-option',
    );
    expect(buttons.length).toBe(2);
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[1].classList.contains('active')).toBe(true);
    expect(buttons[1].disabled).toBe(false);
    expect(host.querySelector('.tag-source-current')?.textContent).toContain(
      '/d4t4/gtm.js',
    );
  });

  it('disables the gateway button when no proxy is configured', () => {
    window.__APP_ENV__ = {
      TAG_SOURCE: 'google',
      TAG_BASE: 'https://www.googletagmanager.com',
      EDGE_PATH: '',
    };
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    const buttons = host.querySelectorAll<HTMLButtonElement>(
      '.tag-source-option',
    );
    expect(buttons[0].classList.contains('active')).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[1].textContent).toContain('Not configured');
  });

  it('reports the resolved source and base', () => {
    setEnv({TAG_SOURCE: 'gateway', TAG_BASE: '/d4t4', EDGE_PATH: '/d4t4'});
    expect(component.active).toBe('gateway');
    expect(component.base).toBe('/d4t4');
    expect(component.gatewayAvailable).toBe(true);
  });

  it('treats a missing edge route as gateway unavailable', () => {
    setEnv({TAG_SOURCE: 'google', TAG_BASE: 'https://www.googletagmanager.com'});
    expect(component.gatewayAvailable).toBe(false);
  });

  it('adds tagsrc while preserving the path and other params', () => {
    setEnv({TAG_SOURCE: 'gateway', TAG_BASE: '/d4t4', EDGE_PATH: '/d4t4'});
    expect(component.urlFor('google')).toBe(
      'https://example.test/products?q=shoe&tagsrc=google',
    );
  });

  it('replaces an existing tagsrc rather than appending', () => {
    setEnv(
      {TAG_SOURCE: 'google', TAG_BASE: 'https://www.googletagmanager.com', EDGE_PATH: '/d4t4'},
      'https://example.test/?tagsrc=google',
    );
    expect(component.urlFor('gateway')).toBe(
      'https://example.test/?tagsrc=gateway',
    );
  });

  it('navigates when switching source', () => {
    setEnv({TAG_SOURCE: 'gateway', TAG_BASE: '/d4t4', EDGE_PATH: '/d4t4'});
    component.select('google');
    expect(assigned).toEqual([
      'https://example.test/products?q=shoe&tagsrc=google',
    ]);
  });

  it('does not navigate when selecting the active source', () => {
    setEnv({TAG_SOURCE: 'gateway', TAG_BASE: '/d4t4', EDGE_PATH: '/d4t4'});
    component.select('gateway');
    expect(assigned).toEqual([]);
  });

  it('does not navigate to an unavailable gateway', () => {
    setEnv({TAG_SOURCE: 'google', TAG_BASE: 'https://www.googletagmanager.com'});
    component.select('gateway');
    expect(assigned).toEqual([]);
  });

  it('only reports an override when one is stored', () => {
    setEnv({TAG_SOURCE: 'gateway', TAG_BASE: '/d4t4', EDGE_PATH: '/d4t4'});
    expect(component.overridden).toBe(false);
    window.sessionStorage.setItem(TAG_SOURCE_STORAGE_KEY, 'google');
    expect(component.overridden).toBe(true);
  });

  it('clears the override and the query param on reset', () => {
    setEnv(
      {TAG_SOURCE: 'google', TAG_BASE: 'https://www.googletagmanager.com', EDGE_PATH: '/d4t4'},
      'https://example.test/products?q=shoe&tagsrc=google',
    );
    window.sessionStorage.setItem(TAG_SOURCE_STORAGE_KEY, 'google');

    component.reset();

    expect(window.sessionStorage.getItem(TAG_SOURCE_STORAGE_KEY)).toBeNull();
    expect(assigned).toEqual(['https://example.test/products?q=shoe']);
  });
});
