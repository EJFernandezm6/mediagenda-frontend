import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck, Shield, Power, Stethoscope } from 'lucide-angular';
import { UsersService, UserRequest } from '../../../core/services/users';
import { AuthService, User as AuthUser } from '../../../core/auth/auth.service';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { DoctorsService } from '../../../core/services/doctors';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';

import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select';
import { PageHeaderComponent } from '../../../shared/components/ui/page-header/page-header.component';
import { SearchInputComponent } from '../../../shared/components/ui/search-input/search-input.component';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [
        CommonModule, 
        FormsModule, 
        LucideAngularModule, 
        PaginationComponent, 
        ButtonComponent, 
        CardComponent,
        SearchableSelectComponent,
        PageHeaderComponent,
        SearchInputComponent
    ],
    templateUrl: './users-list.html',
    styleUrl: './users-list.css'
})
export class UsersListComponent implements OnInit, OnDestroy {
    private usersService = inject(UsersService);
    private authService = inject(AuthService);
    private confirmService = inject(ConfirmModalService);
    private doctorsService = inject(DoctorsService);

    readonly Icons = { Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X, User, Lock, ShieldCheck, Shield, Power, Stethoscope };

    users = this.usersService.users;

    // Local Filter Config
    searchTerm = signal('');
    selectedRole = signal('');
    selectedStatus = signal('');

    // Pagination
    currentPage = signal(1);
    itemsPerPage = 10;

    statusOptions = signal<SelectOption[]>([
        { id: '', label: 'Todos los estados' },
        { id: 'ACTIVE', label: 'Activos' },
        { id: 'INACTIVE', label: 'Inactivos' }
    ]);

    roleOptions = signal<SelectOption[]>([
        { id: '', label: 'Todos los roles' },
        { id: 'ADMIN', label: 'Administradores' },
        { id: 'DOCTOR', label: 'Especialistas' }
    ]);

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
        roleIds: [],
        phone: '',
        photoUrl: ''
    };

    currentUser = this.authService.currentUser;

    // Computed state for local filtering and pagination
    filteredUsers = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const role = this.selectedRole();
        const status = this.selectedStatus();
        let list = this.users() || [];

        // 0. Strict Business Rule: Exclude strict doctors (only Doctor role)
        // These are managed in the Specialists module.
        list = list.filter(u => {
            if (!u) return false;
            const roles = u.roles || [];
            // If they only have 'DOCTOR', we hide them here.
            // If they have 'ADMIN' + 'DOCTOR', they stay.
            const isStrictDoctor = roles.length === 1 && roles[0].toUpperCase() === 'DOCTOR';
            return !isStrictDoctor;
        });

        // 1. Filter by Status
        if (status === 'ACTIVE') list = list.filter(u => u && u.active !== false);
        else if (status === 'INACTIVE') list = list.filter(u => u && u.active === false);

        // 2. Filter by Role
        if (role && role !== 'ALL') {
            list = list.filter(u => {
                if (!u) return false;
                const rolesStr = JSON.stringify(u.roles || []).toUpperCase();
                return rolesStr.includes(role.toUpperCase());
            });
        }

        // 3. Filter by Search Term
        if (term) {
            list = list.filter(u => {
                if (!u) return false;
                return (u.fullName || '').toLowerCase().includes(term) ||
                    (u.email || '').toLowerCase().includes(term);
            });
        }

        return list;
    });

    get usersList() {
        const start = (this.currentPage() - 1) * this.itemsPerPage;
        return this.filteredUsers().slice(start, start + this.itemsPerPage);
    }

    get totalItems() {
        return this.filteredUsers().length;
    }

    availableRoles: any[] = [];

    private searchSubject = new Subject<string>();
    private searchSubscription!: Subscription;

    ngOnInit() {
        // Handled by service
    }

    ngOnDestroy() {
        // Obsolete but keeping empty signature if needed
    }

    // Reset page when filters change
    constructor() {
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
    }

    // ... existing helpers ...

    filterByRole(role: string) {
        this.selectedRole.set(role);
        this.currentPage.set(1);
    }

    filterByStatus(status: string) {
        this.selectedStatus.set(status);
        this.currentPage.set(1);
    }

    onSearch(value: string) {
        this.searchTerm.set(value);
        this.currentPage.set(1);
    }

    private loadUsers() {
        this.usersService.refreshUsers();
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
            password: '',
            roles: [...user.roles],
            roleIds: user.roleIds ?? [],
            phone: user.phone || '',
            phonePrefix: user.phonePrefix || '',
            documentNumber: user.documentNumber || '',
            documentType: user.documentType || '',
            photoUrl: user.photoUrl || ''
        };
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    saveUser() {
        if (this.isEditing && this.editingId) {
            const updatePayload = {
                fullName: this.formData.fullName,
                email: this.formData.email,
                phone: this.formData.phone ?? '',
                phonePrefix: this.formData.phonePrefix ?? '',
                documentNumber: this.formData.documentNumber ?? '',
                documentType: this.formData.documentType ?? '',
                roleIds: this.formData.roleIds?.length ? this.formData.roleIds : undefined,
                photoUrl: this.formData.photoUrl ?? ''
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
            // Clean empty strings to undefined to avoid Backend 400 errors on UUID fields
            const payload = { ...this.formData };
            if (!payload.roleIds?.length) delete payload.roleIds;

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

    async grantAdmin(user: AuthUser) {
        const hasAdmin = this.hasRoleInUser(user, 'ADMIN');

        const confirmed = await this.confirmService.confirm({
            title: hasAdmin ? 'Quitar Administrador' : 'Asignar Administrador',
            message: `¿Estás seguro de ${hasAdmin ? 'quitar' : 'asignar'} el rol de Administrador a ${user.fullName}?`,
            confirmText: hasAdmin ? 'Quitar' : 'Asignar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        const adminRole = this.availableRoles.find(r =>
            String(r.roleKey ?? '').toUpperCase() === 'ADMIN'
        );
        if (!adminRole) {
            alert('No se encontró el rol de Administrador en el sistema.');
            return;
        }

        const currentIds: string[] = user.roleIds ?? [];
        const newRoleIds = hasAdmin
            ? currentIds.filter(id => id !== adminRole.roleId)
            : [...currentIds, adminRole.roleId];

        this.usersService.updateUser(user.id, {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone ?? '',
            roleIds: newRoleIds,
            photoUrl: user.photoUrl ?? ''
        }).subscribe({
            next: () => this.usersService.refreshUsers(),
            error: (err) => alert(err.error?.message ?? 'Error al actualizar el rol.')
        });
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
        const hasDoctor = this.hasRoleInUser(user, 'DOCTOR');

        const confirmed = await this.confirmService.confirm({
            title: 'Cambiar Rol de Especialista',
            message: `¿Estás seguro de ${hasDoctor ? 'quitar' : 'asignar'} el rol de Especialista a ${user.fullName}?`,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        const doctorRole = this.availableRoles.find(r =>
            String(r.roleKey ?? '').toUpperCase() === 'DOCTOR'
        );
        if (!doctorRole) {
            alert('No se encontró el rol de Especialista en el sistema.');
            return;
        }

        const currentIds: string[] = user.roleIds ?? [];
        const newRoleIds = hasDoctor
            ? currentIds.filter(id => id !== doctorRole.roleId)
            : [...currentIds, doctorRole.roleId];

        this.usersService.updateUser(user.id, {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone ?? '',
            roleIds: newRoleIds,
            photoUrl: user.photoUrl ?? ''
        }).subscribe({
            next: () => this.usersService.refreshUsers(),
            error: (err) => alert(err.error?.message ?? 'Error al actualizar el rol.')
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
        return this.formData.roleIds ? this.formData.roleIds.includes(role.roleId) : false;
    }

    isAdminRoleLocked(role: any): boolean {
        return this.isEditing
            && this.editingId === this.currentUser()?.id
            && String(role.roleKey ?? '').toUpperCase() === 'ADMIN'
            && this.isRoleSelected(role);
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
