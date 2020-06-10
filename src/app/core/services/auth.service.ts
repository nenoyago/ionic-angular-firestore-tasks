import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { User, AuthProvider, AuthOptions } from './auth.types';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  authState$: Observable<firebase.User>

  constructor(private afAuth: AngularFireAuth) {
    this.authState$ = this.afAuth.authState
  }

  get isAuthenticated(): Observable<boolean> {
    return this.authState$.pipe(map(user => user !== null))
  }

  authenticate({ isSignIn, provider, user }: AuthOptions): Promise<auth.UserCredential> {
    let operation: Promise<auth.UserCredential>

    if (provider !== AuthProvider.Email) {
      operation = this.signInWithPopUp(provider)
    } else {
      operation = isSignIn ? this.signInWithEmail(user) : this.signUpWithEmail(user)
    }

    return operation
  }

  logout(): Promise<void> {
    return this.afAuth.auth.signOut()
  }

  private signInWithEmail({ email, password }: User): Promise<auth.UserCredential> {
    return this.afAuth.auth.signInWithEmailAndPassword(email, password)
  }

  private signUpWithEmail({ email, password, name }: User): Promise<auth.UserCredential> {
    return this.afAuth.auth
      .createUserWithEmailAndPassword(email, password)
      .then(credentials =>
        credentials.user
          .updateProfile({ displayName: name, photoURL: null })
          .then(() => credentials)
      )
  }

  private signInWithPopUp(provider: AuthProvider): Promise<auth.UserCredential> {
    let signInProvider = null;

    switch (provider) {
      case AuthProvider.Facebook:
        signInProvider = new auth.FacebookAuthProvider()
        break
    }

    return this.afAuth.auth.signInWithPopup(signInProvider)
  }

  async recoverPassword(email: string, provider: AuthProvider) {
    return new Promise((resolve, reject) => {
      if (provider !== AuthProvider.Facebook) {
        this.afAuth.auth.sendPasswordResetEmail(email).then(() => {
          resolve(true)
        }).catch(error => {
          reject(error)
        })
      }
    }
    )
  }

  userInitials(user: firebase.User): string {
    if (this.isAuthenticated) {
      if (user.displayName) {
        let arrayName = user.displayName.split(' ');
        if (arrayName && arrayName.length > 0) {
          let firstName = arrayName[0];
          let lastName = arrayName[1];
          let initials = ''

          if (firstName) {
            initials += firstName.charAt(0);
          }

          if (lastName) {
            initials += lastName.charAt(0)
          } else {
            initials += firstName.charAt(1)
          }
          return initials;
        }
      }
      return '';
    }

  }

}