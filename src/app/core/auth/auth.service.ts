import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

export interface Feature {
    featureKey: string;
    name: string;
    path: string;
    order: number;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

export interface User {
    id: string;
    fullName: string;
    email: string;
    roleId?: string;
    photoUrl?: string;
    clinicId?: string;
    roles: string[];
    cmp?: string;
    phone?: string;
    plan?: 'STANDARD' | 'PLUS' | 'PREMIUM';
    subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'PENDING';
    active?: boolean;
    features?: Feature[];
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
                    id: response.userId,
                    fullName: response.fullName || '',
                    email: response.email,
                    roles: [],
                    photoUrl: `https://ui-avatars.com/api/?name=${response.email}&background=0D8ABC&color=fff`,
                    subscriptionStatus: 'ACTIVE',
                    clinicId: response.clinicId,
                    roleId: response.roleId,
                    active: response.active !== undefined ? response.active : true,
                    features: response.features ?? []
                };

                if (user.active === false) {
                    throw { status: 403, message: 'Usuario inactivo. Contacte al administrador.' };
                }

                if (!user.features || user.features.length === 0) {
                    throw { status: 403, code: 'NO_FEATURES', message: 'No tiene módulos asignados. Contacte al administrador.' };
                }

                this.currentUser.set(user);
                localStorage.setItem('token', response.token); // Backend sends token
                localStorage.setItem('user', JSON.stringify(user));

                // Navigate
                this.router.navigate(['/app/dashboard']);
            })
        );
    }

    forgotPassword(email: string) {
        return this.http.post<{ message: string, code?: string }>(`${this.apiUrl}/forgot-password`, { email });
    }

    validateCode(email: string, code: string) {
        return this.http.post<{ valid: boolean }>(`${this.apiUrl}/validate-code`, { email, code });
    }

    resetPassword(email: string, code: string, newPassword: string) {
        return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { email, code, newPassword });
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
