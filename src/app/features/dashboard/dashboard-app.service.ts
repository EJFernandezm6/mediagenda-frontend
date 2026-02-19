import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface DashboardKpiResponse {
    appointmentsToday: KpiItem;
    confirmationRate: KpiItem;
    cancellationRate: KpiItem;
    monthlyRevenue: KpiItem;
}

export interface KpiItem {
    value: string;
    subtext: string;
    trend: 'UP' | 'DOWN' | 'NEUTRAL';
}

export interface ChartDataPoint {
    name: string;
    value: number;
}

export interface TopDoctorItem {
    name: string;
    count: number;
    revenue: number;
    rating: number;
}

export interface TopPatientItem {
    name: string;
    count: number;
}

export interface DashboardChartsResponse {
    patientsByStatus: ChartDataPoint[];
    visitsBySpecialty: ChartDataPoint[];
    genderDistribution: ChartDataPoint[];
    ageDistribution: ChartDataPoint[];
    paymentMethods: ChartDataPoint[];
    peakDays: ChartDataPoint[];
    peakHours: ChartDataPoint[];
    revenueBySpecialty: ChartDataPoint[];
    topDoctors: TopDoctorItem[];
    topPatients: TopPatientItem[];
}

@Injectable({
    providedIn: 'root'
})
export class DashboardAppService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/dashboard`;

    getKpis(date?: string): Observable<DashboardKpiResponse> {
        let params = new HttpParams();
        if (date) params = params.set('date', date);
        return this.http.get<DashboardKpiResponse>(`${this.apiUrl}/kpis`, { params });
    }

    getCharts(from?: string, to?: string): Observable<DashboardChartsResponse> {
        let params = new HttpParams();
        if (from) params = params.set('from', from);
        if (to) params = params.set('to', to);
        return this.http.get<DashboardChartsResponse>(`${this.apiUrl}/charts`, { params });
    }
}
