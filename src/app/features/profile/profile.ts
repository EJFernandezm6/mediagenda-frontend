import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { LucideAngularModule, User, UserCog, Save, Lock, KeyRound, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { UsersService } from '../../core/services/users';

// Validator custom pattern for password match
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
        return { mismatch: true };
    }
    return null;
}

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
    templateUrl: './profile.html'
})
export class ProfileComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private usersService = inject(UsersService);

    currentUser = this.authService.currentUser;

    // UI State
    isUpdatingProfile = false;
    isChangingPassword = false;
    showPassword = false;
    showCurrentPassword = false;

    icons = {
        User, UserCog, Save, Lock, KeyRound, Eye, EyeOff
    };

    profileForm: FormGroup;
    passwordForm: FormGroup;

    constructor() {
        const user = this.currentUser();

        this.profileForm = this.fb.group({
            fullName: [user?.fullName || '', [Validators.required]],
            phone: [user?.phone || ''],
            photoUrl: [user?.photoUrl || '']
        });

        this.passwordForm = this.fb.group({
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: passwordMatchValidator });
    }

    onUpdateProfile() {
        if (this.profileForm.invalid) return;

        const user = this.currentUser();
        if (!user) return;

        this.isUpdatingProfile = true;

        const updates = {
            fullName: this.profileForm.value.fullName,
            phone: this.profileForm.value.phone,
            photoUrl: this.profileForm.value.photoUrl
        };

        this.usersService.updateUser(user.id, updates).subscribe({
            next: () => {
                // Update local auth state manually to reflect changes immediately
                // Alternatively calling authService.reloadUser() if implemented
                const updatedUser = { ...user, ...updates };
                this.authService.currentUser.set(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));

                this.isUpdatingProfile = false;
                alert('Perfil actualizado correctamente');
            },
            error: (err) => {
                console.error('Error updating profile:', err);
                this.isUpdatingProfile = false;
                alert('Error al actualizar el perfil');
            }
        });
    }

    onChangePassword() {
        if (this.passwordForm.invalid) return;

        const user = this.currentUser();
        if (!user) return;

        this.isChangingPassword = true;
        const newPassword = this.passwordForm.value.password;

        // Assuming updateUser handles password update if 'password' field is present
        this.usersService.updateUser(user.id, { password: newPassword }).subscribe({
            next: () => {
                this.isChangingPassword = false;
                this.passwordForm.reset();
                alert('Contraseña actualizada correctamente');
            },
            error: (err) => {
                console.error('Error updating password:', err);
                this.isChangingPassword = false;
                alert('Error al cambiar la contraseña');
            }
        });
    }
}
