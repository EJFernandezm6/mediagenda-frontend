import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();

    if (!user) {
        return router.createUrlTree(['/auth/login']);
    }

    if (!user.features || user.features.length === 0) {
        authService.logout();
        return router.createUrlTree(['/auth/login']);
    }

    return true;
};
