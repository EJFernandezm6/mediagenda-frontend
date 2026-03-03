import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface LabelCountItem { label: string; count: number; }
export interface SpecialtyDemandItem { specialtyId: string; specialtyName: string; count: number; }
export interface AgeRangeItem { ageRange: string; count: number; avgAge: number; }
export interface HourRangeItem { hourRange: string; avgCount: number; }
export interface FrequentPatientItem { patientId: string; patientName: string; count: number; }
export interface RevenueBySpecialtyItem { specialtyId: string; specialtyName: string; revenue: number; }
export interface TopDoctorItem { doctorId: string; doctorName: string; count: number; }
export interface EvolutionItem { period: string; count: number; }

export type Granularity = 'MONTH' | 'WEEK';

@Injectable({ providedIn: 'root' })
export class DashboardAppService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/dashboard`;

    private range(from: string, to: string): HttpParams {
        return new HttpParams().set('from', from).set('to', to);
    }

    paymentStatus(from: string, to: string): Observable<LabelCountItem[]> {
        return this.http.get<LabelCountItem[]>(`${this.base}/payment-status`, { params: this.range(from, to) });
    }

    specialtyDemand(from: string, to: string): Observable<SpecialtyDemandItem[]> {
        return this.http.get<SpecialtyDemandItem[]>(`${this.base}/specialty-demand`, { params: this.range(from, to) });
    }

    patientsByGender(from: string, to: string): Observable<LabelCountItem[]> {
        return this.http.get<LabelCountItem[]>(`${this.base}/patients-by-gender`, { params: this.range(from, to) });
    }

    patientsByAge(from: string, to: string, cutoffs: number[]): Observable<AgeRangeItem[]> {
        let params = this.range(from, to);
        cutoffs.forEach(c => params = params.append('cutoffs', c.toString()));
        return this.http.get<AgeRangeItem[]>(`${this.base}/patients-by-age`, { params });
    }

    busiestDays(from: string, to: string): Observable<LabelCountItem[]> {
        return this.http.get<LabelCountItem[]>(`${this.base}/busiest-days`, { params: this.range(from, to) });
    }

    appointmentsByHour(from: string, to: string, rangeWidthHours: number): Observable<HourRangeItem[]> {
        return this.http.get<HourRangeItem[]>(`${this.base}/appointments-by-hour`, {
            params: this.range(from, to).set('rangeWidthHours', rangeWidthHours.toString())
        });
    }

    paymentMethods(from: string, to: string): Observable<LabelCountItem[]> {
        return this.http.get<LabelCountItem[]>(`${this.base}/payment-methods`, { params: this.range(from, to) });
    }

    frequentPatients(from: string, to: string): Observable<FrequentPatientItem[]> {
        return this.http.get<FrequentPatientItem[]>(`${this.base}/frequent-patients`, { params: this.range(from, to) });
    }

    revenueBySpecialty(from: string, to: string): Observable<RevenueBySpecialtyItem[]> {
        return this.http.get<RevenueBySpecialtyItem[]>(`${this.base}/revenue-by-specialty`, { params: this.range(from, to) });
    }

    topDoctors(from: string, to: string): Observable<TopDoctorItem[]> {
        return this.http.get<TopDoctorItem[]>(`${this.base}/top-doctors`, { params: this.range(from, to) });
    }

    patientEvolution(from: string, to: string, granularity: Granularity): Observable<EvolutionItem[]> {
        return this.http.get<EvolutionItem[]>(`${this.base}/patient-evolution`, {
            params: this.range(from, to).set('granularity', granularity)
        });
    }

    appointmentEvolution(from: string, to: string, granularity: Granularity): Observable<EvolutionItem[]> {
        return this.http.get<EvolutionItem[]>(`${this.base}/appointment-evolution`, {
            params: this.range(from, to).set('granularity', granularity)
        });
    }
}
