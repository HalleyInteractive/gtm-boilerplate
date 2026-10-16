/**
 * @fileoverview unit tests for the LoginFormComponent.
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

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import type { Mock } from 'vitest';
import { User } from 'src/app/models/user';
import { LoginService } from 'src/app/services/login.service';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
    let component: LoginFormComponent;
    let fixture: ComponentFixture<LoginFormComponent>;
    let mockLoginService: {
        logUserIn: Mock<(user: User) => Promise<void>>;
        logUserOut: Mock<() => void>;
        setUserInDataLayer: Mock<(user: User) => void>;
        user: User;
    };
    const mockUserData: User = {
        id: '2',
        name: 'John Smith',
        email: 'john.smith@example.com',
        sha256_email_address: '8e621e3d0368631d263d07a351fa8d34fba0d17c15fbcdec11a5f58008d022a0',
        phone_number: '+15555555555',
        sha256_phone_number: '910a625c4ba147b544e6bd2f267e130ae14c591b6ba9c25cb8573322dedbebd0',
        address: {
            first_name: 'John',
            sha256_first_name: '96d9632f363564cc3032521409cf22a852f2032eec099ed5967c0d000cec607a',
            last_name: 'Smith',
            sha256_last_name: '6627835f988e2c5e50533d491163072d3f4f41f5c8b04630150debb3722ca2dd',
            street: '1600 Amphitheatre Pkwy',
            city: 'Mountain View',
            region: 'CA',
            postal_code: '94043',
            country: 'US',
        }
    };

    beforeEach(async () => {
        mockLoginService = {
            logUserIn: vi.fn().mockName("LoginService.logUserIn"),
            logUserOut: vi.fn().mockName("LoginService.logUserOut"),
            setUserInDataLayer: vi.fn().mockName("LoginService.setUserInDataLayer"),
            user: mockUserData
        };

        await TestBed.configureTestingModule({
    imports: [ReactiveFormsModule, LoginFormComponent],
    providers: [{ provide: LoginService, useValue: mockLoginService }],
}).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(LoginFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit()', () => {
        it('should initialize form with user data from LoginService', () => {
            mockLoginService.user = mockUserData;
            component.ngOnInit();
            expect(component.userForm.get('id')?.value).toEqual(mockUserData.id);
            expect(component.userForm.get('first_name')?.value).toEqual(mockUserData.address?.first_name);
            expect(component.userForm.get('last_name')?.value).toEqual(mockUserData.address?.last_name);
            expect(component.userForm.get('email')?.value).toEqual(mockUserData.email);
            expect(component.userForm.get('phone_number')?.value).toEqual(mockUserData.phone_number);
        });

        it('should call setUserInDataLayer on initialization', () => {
            expect(mockLoginService.setUserInDataLayer).toHaveBeenCalledWith(mockUserData);
        });
    });

    describe('login()', () => {
        it('should call logUserIn with form values and close the overlay', async () => {
            component.userForm.setValue({
                id: '3',
                first_name: 'Test',
                last_name: 'User',
                email: 'test@example.com',
                phone_number: '+15555555555',
                street: '1600 Amphitheatre Pkwy',
                city: 'Mountain View',
                region: 'CA',
                postal_code: '94043',
                country: 'US',
            });

            const expectedUser: User = {
                id: '3',
                name: 'Test User',
                email: 'test@example.com',
                sha256_email_address: '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b',
                phone_number: '+15555555555',
                sha256_phone_number: '910a625c4ba147b544e6bd2f267e130ae14c591b6ba9c25cb8573322dedbebd0',
                address: {
                    first_name: 'Test',
                    sha256_first_name: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
                    last_name: 'User',
                    sha256_last_name: '04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb',
                    street: '1600 Amphitheatre Pkwy',
                    city: 'Mountain View',
                    region: 'CA',
                    postal_code: '94043',
                    country: 'US',
                }
            };

            await component.login();
            expect(mockLoginService.logUserIn).toHaveBeenCalledWith(expectedUser);
            expect(component.showOverlay).toBe(false);
        });
    });

    describe('logout()', () => {
        it('should call logUserOut', () => {
            component.logout();
            expect(mockLoginService.logUserOut).toHaveBeenCalled();
        });
    });

    describe('toggleOverlay()', () => {
        it('should toggle the value of showOverlay', () => {
            component.showOverlay = false;
            component.toggleOverlay();
            expect(component.showOverlay).toBe(true);
            component.toggleOverlay();
            expect(component.showOverlay).toBe(false);
        });
    });

    describe('toggleDetails()', () => {
        it('should toggle the value of showDetails', () => {
            component.showDetails = false;
            component.toggleDetails();
            expect(component.showDetails).toBe(true);
            component.toggleDetails();
            expect(component.showDetails).toBe(false);
        });
    });

    describe('onDocumentClick()', () => {
        it('should close the dropdown if clicked outside', () => {
            component.showDetails = true;
            const mockEvent = {
                target: document.createElement('div')
            } as unknown as MouseEvent;
            component.onDocumentClick(mockEvent);
            expect(component.showDetails).toBe(false);
        });

        it('should NOT close the dropdown if clicked inside', () => {
            component.showDetails = true;
            const mockEvent = {
                target: fixture.nativeElement
            } as unknown as MouseEvent;
            component.onDocumentClick(mockEvent);
            expect(component.showDetails).toBe(true);
        });
    });
});
