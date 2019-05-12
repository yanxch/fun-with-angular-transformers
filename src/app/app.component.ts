import { Component } from '@angular/core';
import {interval, BehaviorSubject} from 'rxjs';
import {HeroService} from './hero.service';

declare const VERSION: string;


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Version22: ' + VERSION;

  be2 = new BehaviorSubject(1);

  constructor(private heroService: HeroService) {
    this.heroService.mySubject.subscribe(v => console.log(v));
    interval(1000).subscribe(val => console.log(val));
  }

  ngOnInit() {
    this.be2.subscribe(val => console.log(val));
  }

  ngOnDestroy() {
    console.log('TADAA');
  }
}
