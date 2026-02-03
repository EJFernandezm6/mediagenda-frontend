import { Component } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { LucideAngularModule, LogIn } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  readonly LogInIcon = LogIn;

  constructor(private authService: AuthService) { }

  onLogin() {
    this.authService.login();
  }
}
