import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Mail, Lock, CheckCircle, Key } from 'lucide-angular';
import { AuthService } from '../../../core/auth/auth.service';

type Step = 'EMAIL' | 'CODE' | 'NEW_PASSWORD';

@Component({
    selector: 'app-recover-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
    templateUrl: './recover-password.html',
})
export class RecoverPasswordComponent {
    readonly ArrowLeftIcon = ArrowLeft;
    readonly MailIcon = Mail;
    readonly LockIcon = Lock;
    readonly CheckCircleIcon = CheckCircle;
    readonly KeyIcon = Key;

    currentStep: Step = 'EMAIL';

    email = '';
    verificationCode = '';
    newPassword = '';

    isLoading = false;
    errorMessage = '';
    successMessage = '';

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    onSendEmail() {
        if (!this.email) return;

        this.isLoading = true;
        this.errorMessage = '';

        this.authService.forgotPassword(this.email).subscribe({
            next: (res) => {
                this.isLoading = false;
                this.currentStep = 'CODE';
                this.successMessage = `Hemos enviado un código de verificación a ${this.email}`;
                if (res.code) {
                    console.log('DEV ONLY: Code is', res.code);
                    this.verificationCode = res.code; // Auto-fill for dev convenience if returned
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMessage = 'No se pudo enviar el correo. Inténtalo de nuevo.';
                console.error(err);
            }
        });
    }

    onVerifyCode() {
        if (!this.verificationCode) return;

        this.isLoading = true;
        this.errorMessage = '';
        this.successMessage = '';

        this.authService.validateCode(this.email, this.verificationCode).subscribe({
            next: (res) => {
                this.isLoading = false;
                if (res.valid) {
                    this.successMessage = 'Código verificado correctamente.';
                    this.currentStep = 'NEW_PASSWORD';
                } else {
                    this.errorMessage = 'El código ingresado es incorrecto o ha expirado.';
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMessage = 'Error al verificar el código.';
                console.error(err);
            }
        });
    }

    onResetPassword() {
        if (!this.newPassword || this.newPassword.length < 6) {
            this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.authService.resetPassword(this.email, this.verificationCode, this.newPassword).subscribe({
            next: (res) => {
                this.isLoading = false;
                this.successMessage = 'Contraseña restablecida exitosamente. Redirigiendo al login...';
                setTimeout(() => {
                    this.router.navigate(['/auth/login']);
                }, 2000);
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMessage = 'No se pudo restablecer la contraseña.';
                console.error(err);
            }
        });
    }

    backToEmail() {
        this.currentStep = 'EMAIL';
        this.verificationCode = '';
        this.errorMessage = '';
        this.successMessage = '';
    }
}
