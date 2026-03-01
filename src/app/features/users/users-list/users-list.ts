import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck, Shield, Power, Stethoscope } from 'lucide-angular';
import { UsersService, UserRequest } from '../../../core/services/users';
import { AuthService, User as AuthUser } from '../../../core/auth/auth.service';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { DoctorsService } from '../../../core/services/doctors';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent],
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

    // Pagination
    currentPage = signal(1);
    itemsPerPage = 5;

    // Modal Config
    isModalOpen = false;
    isEditing = false;
    editingId: string | null = null;

    // Form Data
    formData: UserRequest = {
        fullName: '',
        email: '',
        password: '123456',
        roles: [],
        cmp: '',
        clinicId: '',
        roleIds: [],
        phone: '',
        photoUrl: ''
    };

    currentUser = this.authService.currentUser;

    get usersList() {
        return this.users();
    }

    get totalItems() {
        return this.usersService.totalElements();
    }

    availableRoles: any[] = [];

    // Reset page when filters change
    constructor() {
        this.loadUsers();
        this.usersService.getRoles().subscribe({
            next: (roles) => {
                this.availableRoles = roles;
                // console.log('Roles loaded:', this.availableRoles);
            },
            error: (err) => console.error('Error loading roles:', err)
        });
    }

    onPageChange(page: number) {
        this.currentPage.set(page);
        this.loadUsers();
    }

    // ... existing helpers ...

    filterByRole(role: string) {
        this.selectedRole.set(role);
        this.currentPage.set(1);
        this.loadUsers();
    }

    filterByStatus(status: string) {
        this.selectedStatus.set(status);
        this.currentPage.set(1);
        this.loadUsers();
    }

    onSearch(term: string) {
        this.searchTerm.set(term);
        this.currentPage.set(1);
        this.loadUsers();
    }

    private loadUsers() {
        // Map string status to boolean or undefined
        let activeFilter: boolean | undefined = undefined;
        if (this.selectedStatus() === 'ACTIVE') activeFilter = true;
        else if (this.selectedStatus() === 'INACTIVE') activeFilter = false;

        this.usersService.refreshUsers(
            this.currentPage() - 1,
            this.itemsPerPage,
            this.searchTerm(),
            this.selectedRole(),
            activeFilter
        );
    }

    // Role Management in Form (Restricted to just viewing or single hidden role for now)

    hasRole(role: string): boolean {
        return (this.formData.roles as string[]).some(r => r.toUpperCase() === role.toUpperCase());
    }

    hasRoleInUser(user: AuthUser, role: string): boolean {
        return user.roles.some(r => r.toUpperCase() === role.toUpperCase());
    }

    openModal() {
        this.isEditing = false;
        this.editingId = null;
        this.formData = {
            fullName: '',
            email: '',
            password: '123456',
            roles: [],
            cmp: '',
            clinicId: '',
            roleIds: [],
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
            roleIds: user.roleIds ?? [],
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
                roleIds: this.formData.roleIds?.length ? this.formData.roleIds : undefined,
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
            if (!payload.roleIds?.length) delete payload.roleIds;
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
        const hasRole = this.hasRoleInUser(user, 'ADMIN');
        const action = hasRole ? 'quitar' : 'asignar';

        const confirmed = await this.confirmService.confirm({
            title: 'Cambiar Rol de Administrador',
            message: `¿Estás seguro de ${action} el rol de Administrador para ${user.fullName}?`,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        // Calculate new roles
        let newRoles = [...user.roles];
        if (hasRole) {
            newRoles = newRoles.filter(r => r.toUpperCase() !== 'ADMIN');
        } else {
            newRoles.push('ADMIN');
        }

        this.updateUserRoles(user.id, newRoles);
    }

    async toggleActive(user: AuthUser) {
        if (user.id === this.currentUser()?.id) {
            alert('No puedes desactivar tu propia cuenta mientras estás logueado.');
            return;
        }

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
        const hasRole = this.hasRoleInUser(user, 'DOCTOR');
        const action = hasRole ? 'quitar' : 'asignar';

        const confirmed = await this.confirmService.confirm({
            title: 'Cambiar Rol de Especialista',
            message: `¿Estás seguro de ${action} el rol de Especialista para ${user.fullName}?`,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        // Calculate new roles
        let newRoles = [...user.roles];
        if (hasRole) {
            newRoles = newRoles.filter(r => r.toUpperCase() !== 'DOCTOR');
        } else {
            newRoles.push('DOCTOR');
        }

        this.updateUserRoles(user.id, newRoles);
    }

    private updateUserRoles(userId: string, newRoles: string[]) {
        const user = this.users().find(u => u.id === userId);
        if (!user) {
            console.error('User not found for role update');
            return;
        }

        // Determine new primary RoleId
        // Logic: If ADMIN is in newRoles, use ADMIN roleId. 
        // Else if DOCTOR, use DOCTOR roleId.
        // Else use the first one found.
        let targetRoleKey = 'PATIENT'; // Default?
        if (newRoles.some(r => r.toUpperCase() === 'ADMIN')) {
            targetRoleKey = 'ADMIN';
        } else if (newRoles.some(r => r.toUpperCase() === 'DOCTOR')) {
            targetRoleKey = 'DOCTOR';
        } else if (newRoles.length > 0) {
            targetRoleKey = newRoles[0].toUpperCase();
        }

        const roleObj = this.availableRoles.find(r => r.roleKey === targetRoleKey || r.name.toUpperCase() === targetRoleKey);
        const newRoleId = roleObj ? roleObj.roleId : user.roleIds?.[0]; // Fallback to first existing roleId

        const payload: UserRequest = {
            fullName: user.fullName,
            email: user.email,
            roles: newRoles,
            roleIds: newRoleId ? [newRoleId] : [],
            phone: user.phone,
            photoUrl: user.photoUrl,
            clinicId: user.clinicId,
            cmp: user.cmp
        };

        // If roleId is missing, it might cause 400.
        // Let's ensure roleId is not null/undefined if possible.
        // It seems the backend uses roleId to validate the primary role.
        if (!payload.roleIds?.length) {
            console.warn('Warning: Could not determine valid roleIds for roles:', newRoles);
        }

        this.usersService.updateUser(userId, payload).subscribe({
            next: () => {
                this.usersService.refreshUsers();
            },
            error: (err) => {
                console.error('Error updating roles:', err);
                const msg = err.error?.message || 'Error al actualizar los roles.';
                alert(msg);
            }
        });
    }

    toggleRole(role: any) {
        const idx = this.formData.roleIds!.indexOf(role.roleId);
        if (idx >= 0) {
            this.formData.roleIds!.splice(idx, 1);
            this.formData.roles = this.formData.roles.filter(r => r !== role.roleKey);
        } else {
            this.formData.roleIds!.push(role.roleId);
            this.formData.roles.push(role.roleKey);
        }
    }

    isRoleSelected(role: any): boolean {
        return this.formData.roleIds!.includes(role.roleId);
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
