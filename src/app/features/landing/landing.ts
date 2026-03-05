import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, Users, ShieldCheck, ArrowRight, CheckCircle2, Menu, X, MessageCircle, CreditCard, CalendarCheck, Shield, Search, Briefcase, Sliders } from 'lucide-angular';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css']
})
export class LandingComponent {
  readonly Calendar = Calendar;
  readonly Users = Users;
  readonly ShieldCheck = ShieldCheck;
  readonly ArrowRight = ArrowRight;
  readonly CheckCircle2 = CheckCircle2;
  readonly Menu = Menu;
  readonly X = X;
  readonly MessageCircle = MessageCircle;
  readonly CreditCard = CreditCard;
  readonly CalendarCheck = CalendarCheck;
  readonly Shield = Shield;
  readonly Search = Search;
  readonly Briefcase = Briefcase;
  readonly Sliders = Sliders;

  isMenuOpen = false;

  contactForm = {
    name: '',
    role: '',
    email: '',
    message: ''
  };

  submitted = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onSubmit() {
    console.log('Form submitted:', this.contactForm);
    this.submitted = true;
    // Reset form after 3 seconds
    setTimeout(() => {
      this.submitted = false;
      this.contactForm = { name: '', role: '', email: '', message: '' };
    }, 3000);
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    this.isMenuOpen = false;
  }
}
