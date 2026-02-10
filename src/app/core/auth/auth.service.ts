import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

export interface User {
    id: string; // UUID from backend
    fullName: string; // Updated to match Backend
    email: string;
    roleId?: string; // Add roleId for update/create payloads
    photoUrl?: string; // Optional
    clinicId?: string; // Optional

    roles: string[]; // Updated for Multi-Role
    cmp?: string; // Doctor specific
    phone?: string; // Contact info
    plan?: 'STANDARD' | 'PLUS' | 'PREMIUM'; // Backend might need to send this in extra fields
    subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'PENDING';
    active?: boolean;
}

interface AuthResponse {
    token: string;
    userId: string;
    roles: string[];
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private apiUrl = `${environment.apiUrl}/iam/auth`;


    currentUser = signal<User | null>(null);

    constructor() {
        this.restoreSession();
    }

    login(credentials: { email: string, password: string }) {
        return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                const user: User = {
                    id: response.userId, // Backend sends userId
                    fullName: response.fullName || '', // Backend might send fullName or nothing (LoginResponse only has email)
                    email: response.email,
                    roles: [], // Backend sends roleId (UUID), frontend expects string[]. Initialize empty to avoid crash.
                    photoUrl: `https://ui-avatars.com/api/?name=${response.email}&background=0D8ABC&color=fff`, // Default using email
                    subscriptionStatus: 'ACTIVE' // Mocked
                };

                this.currentUser.set(user);
                localStorage.setItem('token', response.accessToken); // Backend sends accessToken
                localStorage.setItem('user', JSON.stringify(user));

                // Navigate
                this.router.navigate(['/app/dashboard']);
            })
        );
    }


    logout() {
        this.currentUser.set(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        this.router.navigate(['/auth/login']);
    }

    restoreSession() {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            this.currentUser.set(JSON.parse(storedUser));
        }
    }
}
