import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface ChartItem { name: string; value: any; }
export interface MultiChartItem { name: string; series: ChartItem[]; }

export interface FrequentPatientItem { patientId: string; patientName: string; count: number; }
export interface TopDoctorItem { doctorId: string; doctorName: string; count: number; }

export type Granularity = 'MONTH' | 'WEEK';

export interface DashboardFilter {
    from: string;
    to: string;
    doctorId?: string | null;
    specialtyId?: string | null;
}

export interface KpiSummary {
    total: number;
    attendedCount: number;
    attendedDetails: ChartItem[];
    activeCount: number;
    activeDetails: ChartItem[];
    cancelledCount: number;
    cancelledDetails: ChartItem[];
}

@Injectable({ providedIn: 'root' })
export class DashboardAppService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/dashboard`;

    private buildParams(filter: DashboardFilter): HttpParams {
        let params = new HttpParams().set('from', filter.from).set('to', filter.to);
        if (filter.doctorId) params = params.set('doctorId', filter.doctorId);
        if (filter.specialtyId) params = params.set('specialtyId', filter.specialtyId);
        return params;
    }

    paymentStatus(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/payment-status`, { params: this.buildParams(f) });
    }

    specialtyDemand(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/specialty-demand`, { params: this.buildParams(f) });
    }

    patientsByGender(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/patients-by-gender`, { params: this.buildParams(f) });
    }

    patientsByAge(f: DashboardFilter, cutoffs: number[]): Observable<ChartItem[]> {
        let params = this.buildParams(f);
        cutoffs.forEach(c => params = params.append('cutoffs', c.toString()));
        return this.http.get<ChartItem[]>(`${this.base}/patients-by-age`, { params });
    }

    busiestDays(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/busiest-days`, { params: this.buildParams(f) });
    }

    appointmentsByHour(f: DashboardFilter, rangeWidthHours: number): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/appointments-by-hour`, {
            params: this.buildParams(f).set('rangeWidthHours', rangeWidthHours.toString())
        });
    }

    paymentMethods(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/payment-methods`, { params: this.buildParams(f) });
    }

    frequentPatients(f: DashboardFilter): Observable<FrequentPatientItem[]> {
        return this.http.get<FrequentPatientItem[]>(`${this.base}/frequent-patients`, { params: this.buildParams(f) });
    }

    revenueBySpecialty(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/revenue-by-specialty`, { params: this.buildParams(f) });
    }

    topDoctors(f: DashboardFilter): Observable<TopDoctorItem[]> {
        return this.http.get<TopDoctorItem[]>(`${this.base}/top-doctors`, { params: this.buildParams(f) });
    }

    patientEvolution(f: DashboardFilter, granularity: Granularity): Observable<MultiChartItem[]> {
        return this.http.get<MultiChartItem[]>(`${this.base}/patient-evolution`, {
            params: this.buildParams(f).set('granularity', granularity)
        });
    }

    appointmentEvolution(f: DashboardFilter, granularity: Granularity): Observable<MultiChartItem[]> {
        return this.http.get<MultiChartItem[]>(`${this.base}/appointment-evolution`, {
            params: this.buildParams(f).set('granularity', granularity)
        });
    }

    appointmentStatuses(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/appointment-statuses`, { params: this.buildParams(f) });
    }

    getKpis(f: DashboardFilter): Observable<KpiSummary> {
        return this.http.get<KpiSummary>(`${this.base}/kpis`, { params: this.buildParams(f) });
    }

    specialtyPerformance(f: DashboardFilter): Observable<MultiChartItem[]> {
        return this.http.get<MultiChartItem[]>(`${this.base}/specialty-performance`, { params: this.buildParams(f) });
    }

    patientRetention(f: DashboardFilter): Observable<MultiChartItem[]> {
        return this.http.get<MultiChartItem[]>(`${this.base}/patient-retention`, { params: this.buildParams(f) });
    }

    monthlyProjection(f: DashboardFilter): Observable<MultiChartItem[]> {
        return this.http.get<MultiChartItem[]>(`${this.base}/monthly-projection`, { params: this.buildParams(f) });
    }

    cancellationReasons(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/cancellation-reasons`, { params: this.buildParams(f) });
    }

    peakTimes(f: DashboardFilter): Observable<MultiChartItem[]> {
        return this.http.get<MultiChartItem[]>(`${this.base}/peak-times`, { params: this.buildParams(f) });
    }

    doctorOccupation(f: DashboardFilter): Observable<ChartItem[]> {
        return this.http.get<ChartItem[]>(`${this.base}/doctor-occupation`, { params: this.buildParams(f) });
    }

    getFirstAppointmentDate(): Observable<string> {
        return this.http.get<string>(`${this.base}/first-appointment-date`);
    }
}
