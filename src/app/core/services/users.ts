import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../auth/auth.service';
import { tap, map } from 'rxjs/operators';

// Interface for creating/updating users (matches Backend UserRequest)
export interface UserRequest {
    fullName: string;
    email: string;
    password?: string;
    roles: string[]; // Updated for Multi-Role
    phone?: string;
    cmp?: string;
    photoUrl?: string;
    clinicId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/users`;

    users = signal<User[]>([]);
    private _currentRole = '';

    constructor() {
        this.refreshUsers();
    }

    refreshUsers(role?: string) {
        if (role !== undefined) {
            this._currentRole = role;
        }

        let params = new HttpParams();
        if (this._currentRole) params = params.set('role', this._currentRole);

        this.http.get<any[]>(this.apiUrl, { params }).pipe(
            // Map backend response to ensure ID consistency
            tap(data => console.log('Raw users data:', data)), // Debug log
            map(users => users.map(u => ({
                ...u,
                id: u.id || u.userId, // Handle potential userId field from backend
                fullName: u.fullName || u.name // Handle potential name field
            } as User)))
        ).subscribe({
            next: (data) => this.users.set(data),
            error: (err) => console.error('Error fetching users:', err)
        });
    }

    getUsers() {
        return this.users();
    }

    addUser(user: UserRequest) {
        // Return observable so component can handle success/close modal
        return this.http.post<User>(this.apiUrl, user).pipe(
            tap(() => this.refreshUsers())
        );
    }

    updateUser(id: string, updates: Partial<UserRequest>) {
        return this.http.put<User>(`${this.apiUrl}/${id}`, updates).pipe(
            tap(() => this.refreshUsers())
        );
    }

    deleteUser(id: string) {
        return this.http.delete(`${this.apiUrl}/${id}`).pipe(
            tap(() => this.refreshUsers())
        );
    }

    toggleAdminRole(id: string) {
        return this.http.post<User>(`${this.apiUrl}/${id}/toggle-admin`, {}).pipe(
            tap(() => this.refreshUsers())
        );
    }

    toggleUserActive(id: string) {
        return this.http.post<User>(`${this.apiUrl}/${id}/toggle-active`, {}).pipe(
            tap(() => this.refreshUsers())
        );
    }
}
