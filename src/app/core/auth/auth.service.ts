import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
    id: string;
    name: string;
    email: string;
    photoUrl: string;
    clinicId: string;
    role: 'ADMIN' | 'DOCTOR' | 'STAFF';
    plan: 'STANDARD' | 'PLUS' | 'PREMIUM';
    subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'PENDING';
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    // Using Signals for reactive state
    currentUser = signal<User | null>(null);

    constructor(private router: Router) { }

    login() {
        // Mock login simulating a Google Auth response
        const mockUser: User = {
            id: 'u1',
            name: 'Dr. Víctor Manzaneda',
            email: 'victor@clinic.com',
            photoUrl: 'https://ui-avatars.com/api/?name=Victor+Manzaneda&background=0D8ABC&color=fff',
            clinicId: 'c1',
            role: 'ADMIN',
            plan: 'PREMIUM',
            subscriptionStatus: 'ACTIVE'
        };

        this.currentUser.set(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));

        // Redirect based on subscription status
        if (mockUser.subscriptionStatus === 'PENDING' || mockUser.subscriptionStatus === 'EXPIRED') {
            this.router.navigate(['/auth/plans']);
        } else {
            this.router.navigate(['/app/dashboard']);
        }
    }

    logout() {
        this.currentUser.set(null);
        localStorage.removeItem('user');
        this.router.navigate(['/auth/login']);
    }

    // Restore session on app load
    restoreSession() {
        const stored = localStorage.getItem('user');
        if (stored) {
            this.currentUser.set(JSON.parse(stored));
        }
    }
}
