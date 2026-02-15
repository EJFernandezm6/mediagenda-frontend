import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Lightbulb, AlertTriangle, Info, TrendingUp } from 'lucide-angular';
import { Recommendation } from './recommendation.model';
import { RecommendationsService } from './recommendations.service';

@Component({
    selector: 'app-recommendations',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './recommendations.component.html'
})
export class RecommendationsComponent implements OnInit {
    private recommendationsService = inject(RecommendationsService);
    recommendations: Recommendation[] = [];
    loading = true;

    // Icons
    icons = { Lightbulb, AlertTriangle, Info, TrendingUp };

    @Input() clinicId: string = 'c1'; // Default to mock 'c1' if not provided

    ngOnInit() {
        this.loadRecommendations();
    }

    loadRecommendations() {
        this.recommendationsService.getRecommendations(this.clinicId).subscribe({
            next: (data) => {
                this.recommendations = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load recommendations', err);
                this.loading = false;
                // Fallback to mock data for demo if backend is not ready/connected
                this.recommendations = [
                    { title: 'Reducir Cancelaciones', description: 'La tasa de cancelación es alta (18%).', type: 'WARNING', metric: '18% Cancelaciones', action: 'Configurar Recordatorios' },
                    { title: 'Promocionar Dermatología', description: 'Alta demanda potencial detectada.', type: 'OPPORTUNITY', metric: '+12% Interés', action: 'Crear Campaña' }
                ];
            }
        });
    }

    getIcon(type: string) {
        switch (type) {
            case 'OPPORTUNITY': return this.icons.TrendingUp;
            case 'WARNING': return this.icons.AlertTriangle;
            case 'INFO': return this.icons.Info;
            default: return this.icons.Lightbulb;
        }
    }

    getColors(type: string) {
        switch (type) {
            case 'OPPORTUNITY': return 'bg-emerald-50 border-emerald-100 text-emerald-800';
            case 'WARNING': return 'bg-amber-50 border-amber-100 text-amber-800';
            case 'INFO': return 'bg-blue-50 border-blue-100 text-blue-800';
            default: return 'bg-gray-50 border-gray-100 text-gray-800';
        }
    }

    getIconColor(type: string) {
        switch (type) {
            case 'OPPORTUNITY': return 'text-emerald-600';
            case 'WARNING': return 'text-amber-600';
            case 'INFO': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    }
}
