import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

export interface User {
    id: string; // UUID from backend
    fullName: string; // Updated to match Backend
    email: string;
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
    private apiUrl = `${environment.apiUrl}/auth`;

    currentUser = signal<User | null>(null);

    constructor() {
        this.restoreSession();
    }

    login(credentials: { email: string, password: string }) {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                const user: User = {
                    id: response.userId,
                    fullName: response.name, // Backend response still sends "name" unless I update AuthResponse too. Check Backend.
                    email: credentials.email,
                    roles: response.roles,
                    photoUrl: `https://ui-avatars.com/api/?name=${response.name}&background=0D8ABC&color=fff`, // Default for now
                    subscriptionStatus: 'ACTIVE' // Mocked for now until backend sends it
                };

                this.currentUser.set(user);
                localStorage.setItem('token', response.token);
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
