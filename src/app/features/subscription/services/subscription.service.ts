import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable, catchError, of, tap } from 'rxjs';

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

export interface UpcomingBilling {
    upcomingBillingId: string;
    subscriptionId: string;
    currency: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    dueDate: string;
    generatedAt: string;
    amountDue: number;
    status: string;
}

export interface UpdateSubscriptionRequest {
    subscriptionId: string;
    currency: string;
    amountPaid: number;
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
    upcomingBilling = signal<UpcomingBilling | null>(null);

    constructor() { }

    setCurrency(currency: 'USD' | 'PEN') {
        this.currentCurrency.set(currency);
    }

    loadPlans(): Observable<SubscriptionPlan[]> {
        return this.http.get<SubscriptionPlan[]>(this.apiUrl).pipe(
            tap(plans => this.plans.set(plans.filter(p => p.isActive).sort((a, b) => a.order - b.order))),
            catchError(() => { this.plans.set([]); return of([]); })
        );
    }

    loadPaymentMethods(): Observable<PaymentMethod[]> {
        return this.http.get<PaymentMethod[]>(`${environment.apiUrl}/payment-methods`).pipe(
            tap(methods => this.paymentMethods.set(methods)),
            catchError(() => { this.paymentMethods.set([]); return of([]); })
        );
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

    loadUpcomingBilling(): Observable<UpcomingBilling | null> {
        return this.http.get<UpcomingBilling>(`${environment.apiUrl}/clinics/my/upcoming-billing`).pipe(
            tap(billing => this.upcomingBilling.set(billing)),
            catchError(() => { this.upcomingBilling.set(null); return of(null); })
        );
    }

    updateSubscription(req: UpdateSubscriptionRequest) {
        return this.http.patch(`${environment.apiUrl}/clinics/my/subscription`, req);
    }
}
