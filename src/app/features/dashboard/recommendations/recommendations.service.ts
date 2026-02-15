import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recommendation } from './recommendation.model';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class RecommendationsService {
    private apiUrl = `${environment.apiUrl}/recommendations`;

    constructor(private http: HttpClient) { }

    getRecommendations(clinicId: string): Observable<Recommendation[]> {
        return this.http.get<Recommendation[]>(`${this.apiUrl}/${clinicId}`);
    }
}
