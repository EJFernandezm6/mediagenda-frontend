import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Trash2, Pencil, Mail, BadgeCheck, X } from 'lucide-angular';
import { UsersService, UserRequest } from '../../../core/services/users';
import { User } from '../../../core/auth/auth.service';

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './users-list.html',
    styleUrl: './users-list.css'
})
export class UsersListComponent {
    private usersService = inject(UsersService);

    users = this.usersService.users;
    selectedRole = signal<string>('');

    // Modal State
    isModalOpen = false;
    isEditing = false;
    editingId: string | null = null;

    formData: UserRequest = {
        fullName: '',
        email: '',
        password: '',
        role: 'DOCTOR',
        cmp: ''
    };

    constructor() { }

    filterByRole(role: string) {
        this.selectedRole.set(role);
        this.usersService.refreshUsers(role);
    }

    openModal() {
        this.isEditing = false;
        this.editingId = null;
        this.resetForm();
        this.isModalOpen = true;
    }

    editUser(user: User) {
        this.isEditing = true;
        this.editingId = user.id;
        this.formData = {
            fullName: user.fullName,
            email: user.email,
            password: '', // Don't show password
            role: user.role,
            cmp: (user as any).cmp || '' // Handle CMP if it exists on User object
        };
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    saveUser() {
        if (this.isEditing && this.editingId) {
            this.usersService.updateUser(this.editingId, this.formData).subscribe(() => {
                this.usersService.refreshUsers(this.selectedRole());
                this.closeModal();
            });
        } else {
            this.usersService.addUser(this.formData).subscribe(() => {
                this.usersService.refreshUsers(this.selectedRole());
                this.closeModal();
            });
        }
    }

    confirmDelete(user: User) {
        if (confirm(`¿Estás seguro de eliminar a ${user.fullName}?`)) {
            this.usersService.deleteUser(user.id).subscribe(() => {
                this.usersService.refreshUsers(this.selectedRole());
            });
        }
    }

    resetForm() {
        this.formData = {
            fullName: '',
            email: '',
            password: '',
            role: 'DOCTOR',
            cmp: ''
        };
    }

    isValid() {
        if (!this.formData.fullName || !this.formData.email) return false;
        if (!this.isEditing && !this.formData.password) return false;
        return true;
    }
}
