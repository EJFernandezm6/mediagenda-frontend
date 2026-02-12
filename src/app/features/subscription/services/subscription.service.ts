import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, catchError, of } from 'rxjs';

export interface SubscriptionPlan {
    subscription_id: number;
    name: string;
    description: string;
    payment_period: 'MONTHLY' | 'YEARLY';
    max_doctors: number;
    max_patients: number;
    max_monthly_appointments: number;
    is_active: boolean;
    prices: { currency: 'USD' | 'PEN', price: number }[];
    features: string[]; // Simplification for UI
}

export interface PaymentMethod {
    payment_method_id: number;
    type: string;
    provider: string;
    last4: string;
    expiry_month: number;
    expiry_year: number;
    is_default: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class SubscriptionService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/subscriptions`;

    // State
    currentCurrency = signal<'USD' | 'PEN'>('PEN');
    plans = signal<SubscriptionPlan[]>([]);
    paymentMethods = signal<PaymentMethod[]>([]);
    currentSubscriptionId = signal<number | null>(null);

    constructor() {
        this.loadPlans();
        this.loadPaymentMethods();
    }

    setCurrency(currency: 'USD' | 'PEN') {
        this.currentCurrency.set(currency);
    }

    loadPlans() {
        // Mock Data for now
        const mockPlans: SubscriptionPlan[] = [
            {
                subscription_id: 1,
                name: 'Básico',
                description: 'Ideal para empezar',
                payment_period: 'MONTHLY',
                max_doctors: 1,
                max_patients: 50,
                max_monthly_appointments: 100,
                is_active: true,
                prices: [{ currency: 'USD', price: 0 }, { currency: 'PEN', price: 0 }],
                features: ['1 Médico', '50 Pacientes', 'Agenda Básica']
            },
            {
                subscription_id: 2,
                name: 'Profesional',
                description: 'Para clínicas en crecimiento',
                payment_period: 'MONTHLY',
                max_doctors: 5,
                max_patients: 500,
                max_monthly_appointments: 1000,
                is_active: true,
                prices: [{ currency: 'USD', price: 29 }, { currency: 'PEN', price: 110 }],
                features: ['5 Médicos', '500 Pacientes', 'Agenda Avanzada', 'Notificaciones']
            },
            {
                subscription_id: 3,
                name: 'Empresarial',
                description: 'Sin límites',
                payment_period: 'MONTHLY',
                max_doctors: 999,
                max_patients: 99999,
                max_monthly_appointments: 99999,
                is_active: true,
                prices: [{ currency: 'USD', price: 99 }, { currency: 'PEN', price: 370 }],
                features: ['Ilimitado', 'Soporte 24/7', 'API Access', 'Marca Blanca']
            }
        ];
        this.plans.set(mockPlans);
    }

    loadPaymentMethods() {
        // Mock Data
        const mockMethods: PaymentMethod[] = [
            {
                payment_method_id: 1,
                type: 'CREDIT_CARD',
                provider: 'STRIPE',
                last4: '4242',
                expiry_month: 12,
                expiry_year: 2028,
                is_default: true
            }
        ];
        this.paymentMethods.set(mockMethods);
    }

    // Actions
    changePlan(planId: number) {
        console.log('Changing plan to:', planId);
        // TODO: Implement API call
        this.currentSubscriptionId.set(planId);
        return of(true);
    }
}
