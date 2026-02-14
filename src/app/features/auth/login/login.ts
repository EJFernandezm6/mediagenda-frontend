import { Component } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { LucideAngularModule, LogIn } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  readonly LogInIcon = LogIn;

  email = '';
  password = '';

  constructor(private authService: AuthService) { }

  errorMessage = '';

  onLogin() {
    if (this.email && this.password) {
      this.errorMessage = ''; // Clear previous errors
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: () => {
          // Navigation is handled in AuthService usually, or here if needed.
          // Assuming AuthService handles everything on success or we stay here.
          // If AuthService redirects, we are good.
        },
        error: (err) => {
          if (err.status === 400) {
            this.errorMessage = 'Usuario o contraseña incorrectos';
          } else {
            this.errorMessage = 'Ocurrió un error inesperado al iniciar sesión';
          }
        }
      });
    }
  }
}
