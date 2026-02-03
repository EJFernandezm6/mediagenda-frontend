import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Check, Star, Zap, Crown } from 'lucide-angular';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './plans.html',
  styleUrl: './plans.css'
})
export class PlansComponent {
  readonly icons = { Check, Star, Zap, Crown };

  plans = [
    {
      id: 'STANDARD',
      name: 'Standard',
      price: '$29',
      features: ['Up to 2 Doctors', 'Basic Calendar', 'Patient Records', 'Email Support'],
      recommended: false,
      color: 'bg-blue-500',
      icon: Star
    },
    {
      id: 'PLUS',
      name: 'Plus',
      price: '$59',
      features: ['Up to 5 Doctors', 'Advanced Analytics', 'SMS Reminders', 'Priority Support'],
      recommended: true,
      color: 'bg-indigo-600',
      icon: Zap
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      price: '$99',
      features: ['Unlimited Doctors', 'Custom Branding', 'API Access', '24/7 Dedicated Support'],
      recommended: false,
      color: 'bg-purple-600',
      icon: Crown
    }
  ];

  constructor(private router: Router) { }

  selectPlan(planId: string) {
    console.log('Selected Plan:', planId);
    // In a real app, integrate with Stripe/Payment Gateway here
    // For now, simulate success and redirect to dashboard
    this.router.navigate(['/app/dashboard']);
  }
}
