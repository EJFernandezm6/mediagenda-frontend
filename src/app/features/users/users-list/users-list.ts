import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck, Shield, Power, Stethoscope } from 'lucide-angular';
import { UsersService, UserRequest } from '../../../core/services/users';
import { AuthService, User as AuthUser } from '../../../core/auth/auth.service';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { DoctorsService } from '../../../core/services/doctors';

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
    private doctorsService = inject(DoctorsService);

    readonly Icons = { Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck, Shield, Power, Stethoscope };

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
        password: '123456',
        roles: ['ADMIN'], // Default to ADMIN for new users in this module
        cmp: '', // Kept in model but hidden in UI as requested
        clinicId: '',
        roleId: '',
        phone: '',
        photoUrl: ''
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
            currentUsers = currentUsers.filter((u: AuthUser) =>
                u.roles.some(r => r.toUpperCase() === role.toUpperCase())
            );
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
        return (this.formData.roles as string[]).some(r => r.toUpperCase() === role.toUpperCase());
    }

    hasRoleInUser(user: AuthUser, role: string): boolean {
        return user.roles.some(r => r.toUpperCase() === role.toUpperCase());
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
            password: '123456', // Default password
            roles: ['ADMIN'], // Always ADMIN
            cmp: '',
            clinicId: '',
            roleId: '',
            phone: '',
            photoUrl: ''
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
            clinicId: user.clinicId,
            roleId: user.roleId,
            phone: user.phone || '',
            photoUrl: user.photoUrl || ''
        };
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    saveUser() {
        if (this.isEditing && this.editingId) {
            // Clean payload for update (email is not editable)
            const updatePayload = {
                fullName: this.formData.fullName,
                phone: this.formData.phone,
                roleId: this.formData.roleId || undefined,
                photoUrl: this.formData.photoUrl
            };

            console.log('🔄 Updating user:', this.editingId, 'with payload:', updatePayload);

            this.usersService.updateUser(this.editingId, updatePayload).subscribe({
                next: () => {
                    console.log('✅ User updated successfully');
                    this.closeModal();
                },
                error: (err) => {
                    console.error('❌ Error updating user:', err);
                    alert('Error al actualizar usuario. Verifique los datos.');
                }
            });
        } else {
            // New User: Ensure clinicId is set
            const currentUser = this.currentUser();
            if (currentUser?.clinicId) {
                this.formData.clinicId = currentUser.clinicId;
            }

            // Clean empty strings to undefined to avoid Backend 400 errors on UUID fields
            const payload = { ...this.formData };
            if (!payload.roleId) delete payload.roleId;
            if (!payload.cmp) delete payload.cmp;
            // Keep clinicId - it's required and copied from current user

            this.usersService.addUser(payload).subscribe({
                next: () => this.closeModal(),
                error: (err) => {
                    console.error('Error adding user:', err);
                    // Try to extract meaningful error message from backend
                    let errorMessage = 'Error al crear usuario.';
                    if (err.error?.message) {
                        errorMessage = err.error.message;
                    } else if (err.error?.errors) {
                        errorMessage = JSON.stringify(err.error.errors);
                    } else if (err.message) {
                        errorMessage = err.message;
                    }
                    alert(errorMessage);
                }
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

        const isDoctor = this.hasRoleInUser(user, 'DOCTOR');
        const newStatus = !user.active; // Toggle current status

        // If is Doctor, use DoctorsService which updates BOTH User and Doctor Profile
        // If not, use generic UsersService
        const update$ = isDoctor
            ? this.doctorsService.updateDoctor(user.id, { active: newStatus })
            : this.usersService.toggleUserActive(user.id);

        (update$ as any).subscribe({
            next: () => {
                // Success
                // Refresh users to reflect changes (DoctorsService handles its own refresh but UsersService needs trigger)
                if (!isDoctor) this.usersService.refreshUsers();
            },
            error: (err: any) => {
                console.error('Error toggling active status:', err);
                alert('Error al cambiar el estado. Por favor intente nuevamente.');
            }
        });
    }

    async toggleSpecialist(user: AuthUser) {
        const isSpecialist = this.hasRoleInUser(user, 'DOCTOR');
        const title = isSpecialist ? 'Quitar Rol de Especialista' : 'Asignar Rol de Especialista';
        const message = isSpecialist
            ? `¿Estás seguro de quitar el rol de Especialista a ${user.fullName}?`
            : `¿Estás seguro de asignar el rol de Especialista a ${user.fullName}?`;

        const confirmed = await this.confirmService.confirm({
            title,
            message,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        this.usersService.toggleSpecialistRole(user.id).subscribe({
            next: () => {
                // Success
            },
            error: (err) => {
                console.error('Error toggling specialist role:', err);
                alert('Error al cambiar el rol. Por favor intente nuevamente.');
            }
        });
    }

    isValid() {
        if (!this.formData.fullName || !this.formData.email) return false;
        if (!this.isEditing && !this.formData.password) return false;
        if (this.formData.roles.length === 0) return false; // Must have at least one role

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.formData.email)) return false;

        return true;
    }
}
