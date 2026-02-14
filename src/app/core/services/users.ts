import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../auth/auth.service';
import { tap, map, switchMap } from 'rxjs/operators';

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
    roleId?: string;
}

export interface UpdateProfileRequest {
    fullName?: string;
    phone?: string;
    photoUrl?: string;
}

export interface ChangePasswordRequest {
    currentPassword?: string;
    newPassword?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/iam/users`;


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
                id: u.userId || u.id, // Backend sends 'userId'
                fullName: u.fullName || u.name, // Handle potential name field
                // Ensure other fields sort of match or at least don't break
            } as User)))

        ).subscribe({
            next: (data) => this.users.set(data),
            error: (err) => console.error('Error fetching users:', err)
        });
    }

    getUsers() {
        return this.users();
    }

    private rolesUrl = `${environment.apiUrl}/iam/roles`;

    getRoles() {
        return this.http.get<any[]>(this.rolesUrl);
    }

    addUser(user: UserRequest) {
        // 1. Fetch Roles to get ADMIN ID
        return this.getRoles().pipe(
            switchMap(roles => {
                // Default to ADMIN if no specific role is requested (or if user.roles contains ADMIN)
                // The frontend currently only creates ADMINs via this form
                const targetRole = user.roles.includes('ADMIN') ? 'ADMIN' : user.roles[0];
                const roleObj = roles.find(r => r.roleKey === targetRole || r.name.toUpperCase() === targetRole);

                if (!roleObj) {
                    throw new Error(`Role ${targetRole} not found`);
                }

                // 2. Create STRICT payload for backend (remove 'roles' array, keep only roleId)
                const finalPayload = {
                    fullName: user.fullName,
                    email: user.email,
                    password: user.password,
                    roleId: roleObj.roleId,
                    phone: user.phone || '', // Ensure string
                    photoUrl: user.photoUrl || '' // Ensure string
                    // Backend infers clinicId from authenticated user's JWT token
                };

                console.log('🔍 Role found:', roleObj);
                console.log('📤 Final payload to send:', finalPayload);

                // 3. Create User
                return this.http.post<User>(this.apiUrl, finalPayload);
            }),
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

    toggleAdminRole(userId: string) {
        return this.http.post<void>(`${this.apiUrl}/${userId}/toggle-admin`, {}).pipe(
            tap(() => this.refreshUsers())
        );
    }

    toggleSpecialistRole(userId: string) {
        return this.http.post<void>(`${this.apiUrl}/${userId}/toggle-specialist`, {}).pipe(
            tap(() => this.refreshUsers())
        );
    }

    toggleUserActive(id: string) {
        return this.http.post<User>(`${this.apiUrl}/${id}/toggle-active`, {}).pipe(
            tap(() => this.refreshUsers())
        );
    }

    updateProfile(data: UpdateProfileRequest) {
        // Use separate endpoint for profile update
        return this.http.put<User>(`${this.apiUrl}/profile`, data).pipe(
            tap(() => this.refreshUsers())
        );
    }

    changePassword(data: ChangePasswordRequest) {
        return this.http.put<void>(`${this.apiUrl}/change-password`, data);
    }
}
