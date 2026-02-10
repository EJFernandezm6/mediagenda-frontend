import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DoctorsService, Doctor } from '../../../core/services/doctors';
import { LucideAngularModule, User, Star, MapPin, Phone, Mail, Award, ArrowLeft, TrendingUp, Users, MessageSquare } from 'lucide-angular';


@Component({
    selector: 'app-doctor-detail',
    standalone: true,
    imports: [CommonModule, RouterLink, LucideAngularModule],
    templateUrl: './doctor-detail.html',
    styleUrl: './doctor-detail.css'
})
export class DoctorDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private doctorsService = inject(DoctorsService);

    readonly icons = { User, Star, MapPin, Phone, Mail, Award, ArrowLeft, TrendingUp, Users, MessageSquare };

    doctor = signal<Doctor | null>(null);
    reviews = signal<any[]>([]);
    nps = signal<number>(0);
    isLoading = signal(true);

    promotersCount = computed(() => this.reviews().filter(r => r.score >= 9).length);
    detractorsCount = computed(() => this.reviews().filter(r => r.score <= 6).length);

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadDoctorData(id);
        }
    }

    loadDoctorData(userId: string) {
        this.isLoading.set(true);

        // First find the doctor in the list to get the doctorId
        const found = this.doctorsService.doctors().find(d => d.id === userId);

        if (found) {
            this.doctor.set(found);
            if (found.doctorId) {
                this.doctorsService.getDoctorReviews(found.doctorId).subscribe({
                    next: (reviews) => {
                        this.reviews.set(reviews);
                        this.nps.set(this.doctorsService.calculateNPS(reviews));
                        this.isLoading.set(false);
                    },
                    error: () => this.isLoading.set(false)
                });
            } else {
                this.isLoading.set(false);
            }
        } else {
            // If not in cache, we could implement getDoctorById in service
            this.isLoading.set(false);
        }
    }

    getStarRating(score: number): number[] {
        // Score is 0-10, convert to 0-5 stars
        const stars = Math.round(score / 2);
        return Array(stars).fill(0);
    }

    getEmptyStars(score: number): number[] {
        const stars = Math.round(score / 2);
        return Array(5 - stars).fill(0);
    }
}
