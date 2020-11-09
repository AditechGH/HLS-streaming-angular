import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { Stream } from '../../models/stream';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public streams: Stream[];
  constructor(
    private router: Router,
    private api: ApiService) { }

  ngOnInit(): void {
    this.getItems();
  }

  async getItems(): Promise<void> {
    try {
      this.streams = await this.api.getItems();
    } catch (error) {
      console.log(error);
    }
  }

  setSelectedStream(index: string): void {
    this.router.navigate(['/stream'], { queryParams: { idx: btoa(index) } });
  }
}
