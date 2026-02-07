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

  onLogin() {
    if (this.email && this.password) {
      this.authService.login({ email: this.email, password: this.password }).subscribe();
    }
  }
}
