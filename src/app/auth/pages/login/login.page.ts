import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';

import { AuthService } from 'src/app/core/services/auth.service';
import { AuthProvider } from 'src/app/core/services/auth.types';
import { OverlayService } from 'src/app/core/services/overlay.service';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit {
  authForm: FormGroup
  authProviders = AuthProvider
  configs = {
    isSignIn: true,
    action: 'Login',
    actionChange: 'Create account'
  }
  private nameControl = new FormControl('', [Validators.compose([
    Validators.required,
    Validators.minLength(3)
  ])])

  userInitials: string
  passwordType = 'password'
  icon = 'eye-off'


  constructor(private authService: AuthService,
    private formBuilder: FormBuilder,
    private overlayService: OverlayService,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private app: AppComponent) { }

  ngOnInit() {
    this.createForm()
  }

  private createForm() {
    this.authForm = this.formBuilder.group({
      email: ['', [Validators.compose([Validators.email, Validators.required])]],
      password: ['', Validators.compose([Validators.required, Validators.minLength(6)])]
    });
  }

  showHidePassword() {
    if (this.passwordType === 'password') {
      this.passwordType = 'text';
      this.icon = 'eye';
    } else {
      this.passwordType = 'password';
      this.icon = 'eye-off';
    }
  }

  get name(): FormControl {
    return <FormControl>this.authForm.get('name')
  }

  get email(): FormControl {
    return <FormControl>this.authForm.get('email')
  }

  get password(): FormControl {
    return <FormControl>this.authForm.get('password')
  }

  async onSubmit(provider: AuthProvider): Promise<void> {
    const loading = await this.overlayService.loading()
    try {
      const credencials = await this.authService.authenticate({
        isSignIn: this.configs.isSignIn,
        user: this.authForm.value,
        provider
      })
      this.userInitials = this.authService.userInitials(credencials.user)
      localStorage.setItem('userInitials', this.userInitials)
      this.app.init()
      this.navCtrl.navigateForward(this.route.snapshot.queryParamMap.get('redirect') || '/tasks')
      console.log('Redirecting...')
    } catch (error) {
      console.log('Auth error', error)
      await this.overlayService.toast({
        message: error.message
      })
    } finally {
      loading.dismiss()
    }
  }

  async recover(provider: AuthProvider): Promise<void> {
    const loading = await this.overlayService.loading({
      message: `Wait, we're sending a link to your email`
    })
    try {
      const email = this.authForm.value.email
      await this.authService.recoverPassword(email, provider)
      this.overlayService.toast({
        message: 'Password reset email sent.',
        color: 'success'
      })
    } catch (error) {
      console.log('Failed reset password', error)
      await this.overlayService.toast({
        message: error.message
      })
    } finally {
      loading.dismiss()
    }
  }

  changeAuthAction() {
    this.configs.isSignIn = !this.configs.isSignIn
    const { isSignIn } = this.configs
    this.configs.action = isSignIn ? 'Login' : 'Sign Up'
    this.configs.actionChange = isSignIn ? 'Create account' : 'Already have an account'
    !isSignIn
      ? this.authForm.addControl('name', this.nameControl)
      : this.authForm.removeControl('name')
  }

}
