import { Component, OnDestroy } from '@angular/core';
import {interval, BehaviorSubject} from 'rxjs';
import {HeroService} from './hero.service';
import { map } from 'rxjs/operators';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  title = 'Hello World';
  showHistory = true;

  be2 = new BehaviorSubject(1);

  mySubsciptions = [];

  constructor(private heroService: HeroService) {
    
    this.heroService.mySubject.subscribe(v => {
      console.log(v);
      interval(1000).subscribe(val => console.log(val));
    });


    this.mySubsciptions.push(interval(1000).subscribe(val => console.log(val)));

  }

  toggle() {
    this.showHistory = !this.showHistory;
  }

  ngOnInit() {
    this.be2.pipe(
      map(v => v)
    ).subscribe(v => console.log(v));
  }

  ngOnDestroy() {
    console.log('foo');
  }
}

export function connect<T>(component: T) {

  

}
