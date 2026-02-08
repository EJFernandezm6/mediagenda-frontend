import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck } from 'lucide-angular';
import { UsersService, UserRequest } from '../../../core/services/users';
import { AuthService, User as AuthUser } from '../../../core/auth/auth.service';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './users-list.html',
    styleUrl: './users-list.css'
})
export class UsersListComponent {
    private usersService = inject(UsersService);
    private authService = inject(AuthService);

    readonly Icons = { Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck };

    users = this.usersService.users;

    // Filter Config
    searchTerm = signal('');
    selectedRole = signal(''); // Filter by a single role from dropdown

    // Modal Config
    isModalOpen = false;
    isEditing = false;
    editingId: string | null = null;

    // Form Data
    formData: UserRequest = {
        fullName: '',
        email: '',
        password: '',
        roles: ['ADMIN'], // Default to ADMIN for new users in this module
        cmp: '',
        clinicId: ''
    };

    currentUser = this.authService.currentUser;

    filteredUsers = computed(() => {
        let currentUsers = this.users();
        const term = this.searchTerm().toLowerCase();
        const role = this.selectedRole();

        // 1. Filter by Search Term
        if (term) {
            currentUsers = currentUsers.filter((u: AuthUser) =>
                u.fullName.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                (u.cmp && u.cmp.toLowerCase().includes(term))
            );
        }

        // 2. Filter by Role (if selected)
        if (role) {
            currentUsers = currentUsers.filter((u: AuthUser) => u.roles.includes(role));
        }

        return currentUsers;
    });

    // Role Management in Form (Restricted to just viewing or single hidden role for now)
    // We remove the toggle logic as we only create Admins here.

    hasRole(role: string): boolean {
        return (this.formData.roles as string[]).includes(role);
    }

    constructor() { }

    filterByRole(role: string) {
        this.selectedRole.set(role);
    }

    openModal() {
        this.isEditing = false;
        this.editingId = null;
        this.formData = {
            fullName: '',
            email: '',
            password: '',
            roles: ['ADMIN'], // Always ADMIN
            cmp: '',
            clinicId: ''
        };
        this.isModalOpen = true;
    }

    editUser(user: AuthUser) {
        this.isEditing = true;
        this.editingId = user.id;
        this.formData = {
            fullName: user.fullName,
            email: user.email,
            password: '', // Don't fill password
            roles: [...user.roles], // Copy roles
            cmp: user.cmp || '',
            clinicId: user.clinicId
        };
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    saveUser() {
        if (this.isEditing && this.editingId) {
            this.usersService.updateUser(this.editingId, this.formData).subscribe(() => {
                this.closeModal();
            });
        } else {
            this.usersService.addUser(this.formData).subscribe(() => {
                this.closeModal();
            });
        }
    }

    // Delete Modal State
    isDeleteModalOpen = false;
    userToDelete: AuthUser | null = null;

    confirmDelete(user: AuthUser) {
        this.userToDelete = user;
        this.isDeleteModalOpen = true;
    }

    cancelDelete() {
        this.isDeleteModalOpen = false;
        this.userToDelete = null;
    }

    deleteUserConfirmed() {
        if (!this.userToDelete) return;

        this.usersService.deleteUser(this.userToDelete.id).subscribe({
            next: () => {
                this.cancelDelete();
                // Success, list updates automatically via service tap
            },
            error: (err) => {
                console.error('Error deleting user:', err);
                alert('Error al eliminar el usuario. Por favor intente nuevamente.');
                this.cancelDelete();
            }
        });
    }

    isValid() {
        if (!this.formData.fullName || !this.formData.email) return false;
        if (!this.isEditing && !this.formData.password) return false;
        if (this.formData.roles.length === 0) return false; // Must have at least one role
        return true;
    }
}
