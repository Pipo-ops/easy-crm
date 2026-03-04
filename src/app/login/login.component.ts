import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Auth } from '@angular/fire/auth';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private zone = inject(NgZone);

  name = '';
  email = '';
  password = '';
  error = '';

  private async upsertUserDoc() {
    const user = this.auth.currentUser;
    if (!user) return;

    await setDoc(
      doc(this.firestore, 'users', user.uid),
      {
        uid: user.uid,
        name: user.displayName ?? '',
        email: user.email ?? '',
        provider: user.providerData?.[0]?.providerId ?? 'unknown',
        updatedAt: new Date(),
        createdAt: new Date(), // (Achtung: überschreibt bei jedem Login; gleich besser lösen)
      },
      { merge: true },
    );
  }

  async login() {
    console.log('LOGIN clicked');
    this.error = '';
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);

      this.zone.run(() => {
        this.router.navigateByUrl('/dashboard');
      });
    } catch (e: any) {
      this.error = e?.message ?? 'Login fehlgeschlagen';
    }
  }

  async register() {
    this.error = '';
    try {
      if (!this.name.trim()) {
        this.error = 'Bitte Name eingeben (für Registrierung).';
        return;
      }

      const cred = await createUserWithEmailAndPassword(
        this.auth,
        this.email,
        this.password,
      );

      await updateProfile(cred.user, { displayName: this.name.trim() });

      // optional aber empfohlen: User-Dokument anlegen
      await this.upsertUserDoc();

      this.zone.run(() => {
        this.router.navigateByUrl('/dashboard');
      });

      // hier lieber navigateByUrl (weniger “komisch” bei Guards)
      await this.router.navigateByUrl('/dashboard');
    } catch (e: any) {
      this.error = e?.message ?? 'Registrierung fehlgeschlagen';
    }
  }

  async loginWithGoogle() {
    this.error = '';
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);

      await this.upsertUserDoc();
      await this.router.navigateByUrl('/dashboard');
    } catch (e: any) {
      this.error = e?.message ?? 'Google Login fehlgeschlagen';
    }
  }
}
