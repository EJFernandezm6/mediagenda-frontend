import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../auth/auth.service';

// Interface for creating/updating users (matches Backend UserRequest)
export interface UserRequest {
    fullName: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'DOCTOR' | 'STAFF' | 'ESPECIALISTA';
    phone?: string;
    cmp?: string;
    clinicId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/users`;

    users = signal<User[]>([]);

    constructor() {
        this.refreshUsers();
    }

    refreshUsers(role?: string) {
        let params = new HttpParams();
        if (role) params = params.set('role', role);

        this.http.get<User[]>(this.apiUrl, { params }).subscribe({
            next: (data) => this.users.set(data),
            error: (err) => console.error('Error fetching users:', err)
        });
    }

    getUsers() {
        return this.users();
    }

    addUser(user: UserRequest) {
        // Return observable so component can handle success/close modal
        return this.http.post<User>(this.apiUrl, user);
    }

    updateUser(id: string, updates: Partial<UserRequest>) {
        return this.http.put<User>(`${this.apiUrl}/${id}`, updates);
    }

    deleteUser(id: string) {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
