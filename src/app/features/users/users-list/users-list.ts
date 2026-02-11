import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck, Shield, Power } from 'lucide-angular';
import { UsersService, UserRequest } from '../../../core/services/users';
import { AuthService, User as AuthUser } from '../../../core/auth/auth.service';
import { ConfirmModalService } from '../../../core/services/confirm.service';

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
    private confirmService = inject(ConfirmModalService);

    readonly Icons = { Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck, Shield, Power };

    users = this.usersService.users;

    // Filter Config
    searchTerm = signal('');
    selectedRole = signal(''); // Filter by a single role from dropdown
    selectedStatus = signal(''); // Filter by active status

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
        cmp: '', // Kept in model but hidden in UI as requested
        clinicId: ''
    };

    currentUser = this.authService.currentUser;

    filteredUsers = computed(() => {
        let currentUsers = this.users();
        const term = this.searchTerm().toLowerCase();
        const role = this.selectedRole();
        const status = this.selectedStatus();

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

        // 3. Filter by Status (if selected)
        if (status) {
            const isActive = status === 'ACTIVE';
            currentUsers = currentUsers.filter((u: AuthUser) => u.active === isActive);
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

    filterByStatus(status: string) {
        this.selectedStatus.set(status);
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

    async toggleAdmin(user: AuthUser) {
        const confirmed = await this.confirmService.confirm({
            title: 'Cambiar Rol de Administrador',
            message: `¿Estás seguro de cambiar el rol de Administrador para ${user.fullName}?`,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        this.usersService.toggleAdminRole(user.id).subscribe({
            next: () => {
                // Success
            },
            error: (err) => {
                console.error('Error toggling admin role:', err);
                alert('Error al cambiar el rol. Por favor intente nuevamente.');
            }
        });
    }

    async toggleActive(user: AuthUser) {
        const action = user.active ? 'desactivar' : 'activar';
        const confirmed = await this.confirmService.confirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
            message: `¿Estás seguro de ${action} a ${user.fullName}?`,
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        this.usersService.toggleUserActive(user.id).subscribe({
            next: () => {
                // Success
            },
            error: (err) => {
                console.error('Error toggling active status:', err);
                alert('Error al cambiar el estado. Por favor intente nuevamente.');
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
