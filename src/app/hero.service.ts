import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {of} from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class HeroService {

  constructor(private http: HttpClient) {

  }

  readCommitsByUsername(username: string): Promise<any> {


    return this.http.get('https://api.github.com/users/yanxch/events')
      .pipe(map(this.toCommits))
      .toPromise();
  }


  toCommits(response: any[]) {
    const isPushEvent = (entry) => entry.type === 'PushEvent';

    return response
      .filter(isPushEvent)
      .reduce((commits, pushEvent) =>
        commits.concat(pushEvent.payload.commits.map(commit => // flatten commits
          ({
            id: commit.sha,
            name: pushEvent.repo.name,
            author: commit.author.name,
            createdAt: pushEvent.created_at,
            message: commit.message})
          ))
      , []);
  }

}
