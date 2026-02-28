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
    roleIds?: string[];
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
    totalElements = signal<number>(0);
    private _currentRole = '';

    constructor() {
        this.refreshUsers(0, 10, '');
    }

    refreshUsers(page: number = 0, size: number = 10, search: string = '', role?: string, active?: boolean) {
        if (role !== undefined) {
            this._currentRole = role;
        }

        let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
        if (this._currentRole) params = params.set('role', this._currentRole);
        if (search) params = params.set('search', search);
        if (active !== undefined) params = params.set('active', String(active));

        this.http.get<any>(this.apiUrl, { params }).pipe(
            // Map backend response to ensure ID consistency
            tap(data => console.log('Raw users data:', data)), // Debug log
            map(data => {
                return {
                    ...data,
                    content: data.content.map((u: any) => ({
                        ...u,
                        id: u.userId || u.id, // Backend sends 'userId'
                        fullName: u.fullName || u.name, // Handle potential name field
                        // Ensure other fields sort of match or at least don't break
                    } as User))
                };
            })

        ).subscribe({
            next: (data) => {
                this.users.set(data.content);
                this.totalElements.set(data.totalElements);
            },
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
        if (user.roleIds?.length) {
            // roleIds already resolved in the component
            const payload = {
                fullName: user.fullName,
                email: user.email,
                password: user.password,
                roleIds: user.roleIds,
                phone: user.phone || '',
                photoUrl: user.photoUrl || ''
            };
            return this.http.post<User>(this.apiUrl, payload).pipe(
                tap(() => this.refreshUsers())
            );
        }
        // Fallback: resolve by role name (compatibility)
        return this.getRoles().pipe(
            switchMap(roles => {
                const targetRole = user.roles.includes('ADMIN') ? 'ADMIN' : user.roles[0];
                const roleObj = roles.find(r => r.roleKey === targetRole || r.name.toUpperCase() === targetRole);
                if (!roleObj) throw new Error(`Role ${targetRole} not found`);
                const finalPayload = {
                    fullName: user.fullName,
                    email: user.email,
                    password: user.password,
                    roleIds: [roleObj.roleId],
                    phone: user.phone || '',
                    photoUrl: user.photoUrl || ''
                };
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
