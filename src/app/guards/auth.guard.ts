import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { Observable } from 'rxjs';

export const authGuard: CanMatchFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // wenn Auth schon da ist -> sofort erlauben
  if (auth.currentUser) return true;

  // sonst auf initialen Auth-Status warten
  return new Observable<boolean | ReturnType<Router['parseUrl']>>((sub) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('GUARD USER:', user); // muss jetzt loggen
      sub.next(user ? true : router.parseUrl('/login'));
      sub.complete();
      unsubscribe();
    });
  });
};
