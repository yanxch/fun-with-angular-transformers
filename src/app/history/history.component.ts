import { Component, OnInit } from '@angular/core';
import {interval} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    interval(1000).pipe(map(v => v)).subscribe(v => console.log(v));
  }

}
