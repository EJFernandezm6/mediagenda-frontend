import { ApplicationConfig, provideZonelessChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { AuthInterceptor } from './core/auth/auth.interceptor';

import { routes } from './app.routes';

// Register Spanish locale
registerLocaleData(localeEs, 'es');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
};
