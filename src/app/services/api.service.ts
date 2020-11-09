import { Injectable } from '@angular/core';
import { Stream } from '../models/stream';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  items: Stream[] = [
    {
      title: 'Apple Video 1',
      src: 'http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/sl.m3u8'
    },
    {
      title: 'Sintel',
      src: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
    },
    {
      title: 'Big Buck Bunny',
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    },
    {
      title: 'Apple Video 2',
      src: 'http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/sl.m3u8'
    },
    {
      title: 'Test 5',
      src: 'http://playertest.longtailvideo.com/adaptive/wowzaid3/playlist.m3u8'
    }
  ];

  constructor() { }

  public getItems(): Promise<Stream[]> {
    return new Promise( (resolve) => {
      resolve(this.items);
    });
  }

  public getItem(item: string): Promise<Stream> {
    return new Promise( (resolve) => {
      return this.items.forEach((stream) => {
        if (stream.title === item) {
          resolve(stream);
        }
      });
    });
  }

}
