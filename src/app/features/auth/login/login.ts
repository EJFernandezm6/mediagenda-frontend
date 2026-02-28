import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { LoadingService } from '../../../core/services/loading.service';
import { LucideAngularModule, LogIn, Loader2 } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  readonly LogInIcon = LogIn;
  readonly LoaderIcon = Loader2;

  email = '';
  password = '';

  errorMessage = signal('');
  isLoading = signal(false);

  private loadingService = inject(LoadingService);

  constructor(private authService: AuthService) { }

  onLogin() {
    if (this.email && this.password) {
      this.errorMessage.set('');
      this.isLoading.set(true);
      this.loadingService.setMessage('Iniciando sesión...');
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: () => {
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 400) {
            this.errorMessage.set('Usuario o contraseña incorrectos');
          } else if (err.status === 403 && err.code === 'NO_FEATURES') {
            this.errorMessage.set('No tiene módulos asignados. Contacte al administrador.');
          } else if (err.status === 403) {
            this.errorMessage.set('Usuario inactivo. Contacte al administrador.');
          } else {
            this.errorMessage.set('Ocurrió un error inesperado al iniciar sesión');
          }
        }
      });
    }
  }
}
