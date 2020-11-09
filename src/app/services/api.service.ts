import { Injectable } from '@angular/core';
import { Stream } from '../models/stream';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  items: Stream[] = [
    {
      title: 'Steve Jobs Introducing The iPhone',
      src: 'http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/sl.m3u8',
      thumbnail: '../../../assets/jobs.webp',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'
    },
    {
      title: 'Sintel',
      src: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
      thumbnail: '../../../assets/sintel.webp',
      description: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'
    },
    {
      title: 'Big Buck Bunny',
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      thumbnail: '../../../assets/bunny.webp',
      description: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur'
    },
    {
      title: 'Commercial',
      src: 'https://playertest.longtailvideo.com/adaptive/captions/playlist.m3u8',
      thumbnail: '../../../assets/commercial.webp',
      description: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    },
    {
      title: 'Tears of Steel',
      src: 'http://content.jwplatform.com/manifests/vM7nH0Kl.m3u8',
      thumbnail: '../../../assets/tears_of_steel.webp',
      description: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium'
    }
  ];

  constructor() { }

  public getItems(): Promise<Stream[]> {
    return new Promise( (resolve) => {
      resolve(this.items);
    });
  }

}
