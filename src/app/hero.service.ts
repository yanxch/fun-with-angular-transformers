import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeroService {

  count = 1;

  mySubject = new BehaviorSubject(this.count);

  constructor() {}

  increase() {
    this.mySubject.next(this.count + 1);
  }
}
