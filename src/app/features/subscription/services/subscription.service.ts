import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { of, tap } from 'rxjs';

export interface SubscriptionPrice {
    subscriptionPriceId: string;
    currency: 'USD' | 'PEN';
    price: number;
}

export interface SubscriptionCharacteristic {
    characteristicId: string;
    title: string;
    description: string;
    order: number;
    isActive: boolean;
}

export interface SubscriptionPlan {
    subscriptionId: string;
    subscriptionKey: string;
    order: number;
    name: string;
    description: string;
    paymentPeriod: number;
    periodUnit: string;
    maxDoctors: number;
    maxPatients: number;
    maxMonthlyAppointments: number | null;
    isActive: boolean;
    prices: SubscriptionPrice[];
    characteristics: SubscriptionCharacteristic[];
}

export interface PaymentMethod {
    paymentMethodId: string;
    type: string;
    provider: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
}

export interface CreatePaymentMethodRequest {
    type: string;
    provider?: string;
    cardNumber?: string;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class SubscriptionService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/subscriptions`;

    currentCurrency = signal<'USD' | 'PEN'>('PEN');
    plans = signal<SubscriptionPlan[]>([]);
    paymentMethods = signal<PaymentMethod[]>([]);
    currentSubscriptionId = signal<string | null>(null);

    constructor() { }

    setCurrency(currency: 'USD' | 'PEN') {
        this.currentCurrency.set(currency);
    }

    loadPlans() {
        this.http.get<SubscriptionPlan[]>(this.apiUrl).subscribe({
            next: (plans) =>
                this.plans.set(
                    plans
                        .filter(p => p.isActive)
                        .sort((a, b) => a.order - b.order)
                ),
            error: () => this.plans.set([])
        });
    }

    loadPaymentMethods() {
        this.http.get<PaymentMethod[]>(`${environment.apiUrl}/payment-methods`).subscribe({
            next: (methods) => this.paymentMethods.set(methods),
            error: () => this.paymentMethods.set([])
        });
    }

    createPaymentMethod(req: CreatePaymentMethodRequest) {
        return this.http.post<PaymentMethod>(`${environment.apiUrl}/payment-methods`, req).pipe(
            tap(() => this.loadPaymentMethods())
        );
    }

    deletePaymentMethod(id: string) {
        return this.http.delete(`${environment.apiUrl}/payment-methods/${id}`).pipe(
            tap(() => this.loadPaymentMethods())
        );
    }

    changePlan(subscriptionId: string) {
        this.currentSubscriptionId.set(subscriptionId);
        return of(true);
    }
}
