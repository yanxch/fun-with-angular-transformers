import { Component } from '@angular/core';
import {interval} from 'rxjs';

declare const VERSION: string;


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Version22: ' + VERSION;

  constructor() {
  }

  ngOnInit() {
    interval(1000).subscribe(val => console.log(val));
  }

  ngOnDestroy() {
    console.log('TADAA');
  }
}
