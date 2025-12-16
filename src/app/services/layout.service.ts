import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private _sidenavOpened = new BehaviorSubject<boolean>(true);
  sidenavOpened$ = this._sidenavOpened.asObservable();

  setSidenav(open: boolean) {
    this._sidenavOpened.next(open);
  }

  toggleSidenav() {
    this._sidenavOpened.next(!this._sidenavOpened.value);
  }

  get value() {
    return this._sidenavOpened.value;
  }
}
