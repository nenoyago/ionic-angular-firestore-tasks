import { Component } from '@angular/core';

import { Platform, ActionSheetController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AuthService } from './core/services/auth.service';

import { AngularFireStorage } from '@angular/fire/storage';
import { AngularFirestore } from '@angular/fire/firestore';
import { User } from 'firebase';

import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  pages: { url: string, direction: string, icon: string, text: string }[]
  user: firebase.User
  uploadPercent: Observable<number>
  downloadUrl: string
  userInitial: string = ''
  file
  uploadCompleted: boolean = false

  constructor(
    private authService: AuthService,
    private afStorage: AngularFireStorage,
    protected db: AngularFirestore,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    public actionSheetController: ActionSheetController
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.pages = [
      {
        url: '/tasks',
        direction: 'back',
        icon: 'checkmark',
        text: 'Tasks'
      },

      {
        url: '/tasks/create',
        direction: 'forward',
        icon: 'add',
        text: 'New Task'
      }
    ]

    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.init()
    });
  }

  init() {
    this.listeningUser().then((user: User) => {
      this.userInitial = localStorage.getItem('userInitials')
    })
  }

  async listeningUser() {
    return new Promise((resolve, reject) => {
      this.authService.authState$.subscribe(user => {
        this.user = user
        resolve(user)
      })
    })

  }

  uploadPWA(event) {
    const fileList: FileList = event.target.files
    if (fileList && fileList.length > 0) {
      this.file = fileList[0];
      this.firstFileToBase64(fileList[0]).then((result: string) => {
        this.uploadPicture()
      }, (error: any) => {
        this.file = null
      });
    } else {
      this.file = null
    }
  }

  private firstFileToBase64(fileImage: File): Promise<{}> {
    return new Promise((resolve, reject) => {
      const fileReader: FileReader = new FileReader();
      if (fileReader && fileImage != null) {
        fileReader.readAsDataURL(fileImage)
        fileReader.onload = () => {
          resolve(fileReader.result)
        }
        fileReader.onerror = (error) => {
          reject(error);
        }
      } else {
        reject(new Error('Arquivo não encontrado'));
      }
    })
  }

  private uploadPicture() {
    this.uploadCompleted = false
    const ref = this.afStorage.ref(`users/${this.user.uid}/images/${this.user.displayName.toLowerCase()}_photo`)
    const task = ref.put(this.file)
    this.uploadPercent = task.percentageChanges()
    task.snapshotChanges().pipe(
      finalize(() => {
        ref.getDownloadURL().subscribe(url => {
          this.user.updateProfile({ displayName: this.user.displayName, photoURL: url })
            .then(() => {
              this.listeningUser()
              this.uploadCompleted = true
            })
        })
      }))
      .subscribe()
  }

  clearPicture(user: User) {
    user.updateProfile({ displayName: this.user.displayName, photoURL: null })
      .then(() => {
        const ref = this.afStorage.ref(`users/${this.user.uid}/images/${this.user.displayName.toLowerCase()}_photo`)
        ref.delete()
        this.listeningUser()
      })
  }

  async presentActionSheet(fileUpload) {
    const actionSheet = await this.actionSheetController.create({
      cssClass: 'action-sheets-basic-page',
      buttons: [{
        text: 'Delete Picture',
        role: 'destructive',
        icon: 'trash',
        cssClass: 'delete-picture',
        handler: () => {
          this.clearPicture(this.user)
        }
      }, {
        text: 'Change Picture',
        icon: 'cloud-upload',
        cssClass: 'change-picture',
        handler: () => {
          fileUpload.click()
        }
      }]
    })
    await actionSheet.present()
  }

}
