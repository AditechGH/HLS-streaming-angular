import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { Stream } from '../../models/stream';
import * as HLS from 'hls.js';

@Component({
  selector: 'app-stream',
  templateUrl: './stream.component.html',
  styleUrls: ['./stream.component.scss'],
})
export class StreamComponent implements OnInit {
  @ViewChild('video', { static: true }) video: ElementRef;

  index: number;
  lastSeekingIdx: number;
  lastDuration: number;
  lastStartPosition: any;
  streams: Stream[];
  stream: Stream;
  status = 'play_arrow';
  hls: any;
  duration = '-:--';
  currentTime = '-:--';
  interval: any;
  bufferingIdx = -1;
  events: any;
  tracks = [];
  loaded: boolean;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.index = JSON.parse(atob(params.idx));
      this.getItems();
    });
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    if (event.keyCode === 39) {
      this.adjustTime('+');
    }
    if (event.keyCode === 37) {
      this.adjustTime('-');
    }
    if (event.keyCode === 32) {
      this.playPause();
    }
  }

  async getItems(): Promise<void> {
    try {
      this.streams = await this.api.getItems();
      this.processData();
    } catch (error) {
      console.log(error);
    }
  }

  processData(): void {
    this.status = 'play_arrow';
    this.stream = this.streams[this.index];
    this.setupGlobals();
    this.establishHlsStream(this.stream);
    this.setupEvents();
  }

  setupGlobals(): void {
    this.events = {
      url: this.stream.src,
      t0: performance.now(),
      load: [],
      buffer: [],
      video: [],
      level: [],
      bitrate: [],
    };
  }

  establishHlsStream(stream: Stream): void {
    if (this.hls) {
      this.hls.destroy();
      clearInterval(this.hls.bufferTimer);
      this.hls = null;
    }

    const hlsConfig = {
      startLevel: 2,
      capLevelToPlayerSize: true,
    };
    this.hls = new HLS(hlsConfig);

    if (HLS.isSupported()) {
      this.hls.attachMedia(this.video.nativeElement);
      this.hls.loadSource(stream.src);

      this.hls.on(HLS.Events.MEDIA_ATTACHED, () => {
        this.loaded = false;
        this.bufferingIdx = -1;
        this.events.video.push({
          time: performance.now() - this.events.t0,
          type: 'Media attached',
        });
      });

      this.hls.on(HLS.Events.FRAG_BUFFERED, (eventName: any, data: any) => {
        this.loaded = true;
        const event = {
          type: data.frag.type + ' fragment',
          id: data.frag.level,
          id2: data.frag.sn,
          time: data.stats.trequest - this.events.t0,
          latency: data.stats.tfirst - data.stats.trequest,
          load: data.stats.tload - data.stats.tfirst,
          parsing: data.stats.tparsed - data.stats.tload,
          buffer: data.stats.tbuffered - data.stats.tparsed,
          duration: data.stats.tbuffered - data.stats.tfirst,
          bw: Math.round(
            (8 * data.stats.total) /
              (data.stats.tbuffered - data.stats.trequest)
          ),
          size: data.stats.total,
        };
        this.events.load.push(event);
        this.events.bitrate.push({
          time: performance.now() - this.events.t0,
          bitrate: event.bw,
          duration: data.frag.duration,
          level: event.id,
        });
        if (this.events.buffer.length === 0) {
          this.events.buffer.push({
            time: 0,
            buffer: 0,
            pos: 0,
          });
        }
        clearInterval(this.hls.bufferTimer);
        this.hls.bufferTimer = setInterval(() => {
          this.checkBuffer();
        }, 100);
      });

      this.hls.on(HLS.Events.MEDIA_DETACHED, () => {
        clearInterval(this.hls.bufferTimer);
        this.bufferingIdx = -1;
        this.tracks = [];
        this.events.video.push({
          time: performance.now() - this.events.t0,
          type: 'Media detached',
        });
      });

      this.hls.on(HLS.Events.DESTROYING, () => {
        clearInterval(this.hls.bufferTimer);
      });

      this.hls.on(HLS.Events.BUFFER_RESET, () => {
        clearInterval(this.hls.bufferTimer);
      });

      this.hls.on(
        HLS.Events.FRAG_PARSING_INIT_SEGMENT,
        (eventName: any, data: { id: string }) => {
          this.events.video.push({
            time: performance.now() - this.events.t0,
            type: data.id + ' init segment',
          });
        }
      );

      this.hls.on(
        HLS.Events.LEVEL_SWITCHING,
        (eventName: any, data: { level: string | number }) => {
          this.events.level.push({
            time: performance.now() - this.events.t0,
            id: data.level,
            bitrate: Math.round(this.hls.levels[data.level].bitrate / 1000),
          });
        }
      );

      this.hls.on(HLS.Events.MANIFEST_PARSED, (eventName: any, data: any) => {
        this.events.load.push({
          type: 'manifest',
          name: '',
          start: 0,
          end: data.levels.length,
          time: data.stats.trequest - this.events.t0,
          latency: data.stats.tfirst - data.stats.trequest,
          load: data.stats.tload - data.stats.tfirst,
          duration: data.stats.tload - data.stats.tfirst,
        });
        this.video.nativeElement.play();
        this.getCurrentTime();
      });

      this.hls.on(HLS.Events.LEVEL_LOADED, (eventName: any, data: any) => {
        this.events.isLive = data.details.live;
        const event = {
          type: 'level',
          id: data.level,
          start: data.details.startSN,
          end: data.details.endSN,
          time: data.stats.trequest - this.events.t0,
          latency: data.stats.tfirst - data.stats.trequest,
          load: data.stats.tload - data.stats.tfirst,
          parsing: data.stats.tparsed - data.stats.tload,
          duration: data.stats.tload - data.stats.tfirst,
        };

        this.events.load.push(event);
        this.duration = this.format(data.details.totalduration);
      });

      this.hls.on(
        HLS.Events.LEVEL_SWITCHED,
        (eventName: any, data: { level: any }) => {
          const event = {
            time: performance.now() - this.events.t0,
            type: 'level switched',
            name: data.level,
          };
          this.events.video.push(event);
        }
      );

      this.hls.on(HLS.Events.ERROR, (eventName: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case HLS.ErrorTypes.NETWORK_ERROR:
              // try to recover network error
              console.log('fatal network error encountered, try to recover');
              this.hls.startLoad();
              break;
            case HLS.ErrorTypes.MEDIA_ERROR:
              console.log('fatal media error encountered, try to recover');
              this.hls.recoverMediaError();
              break;
            default:
              this.hls.destroy();
              break;
          }
        }
      });

      this.hls.on(
        HLS.Events.BUFFER_CREATED,
        (eventName: any, data: { tracks: any[] }) => {
          this.tracks = data.tracks;
        }
      );
    }
  }

  setupEvents(): void {
    this.video.nativeElement.addEventListener('playing', (evt: any) => {
      if (evt.target.duration - this.lastDuration <= 0.5) {
        // some browsers report several duration change events with almost the same value ... avoid spamming video events
        return;
      }
      this.lastDuration = evt.target.duration;
      const event = {
        time: performance.now() - this.events.t0,
        type: evt.type,
        name: Math.round(evt.target.duration * 1000),
      };

      this.events.video.push(event);
    });

    this.video.nativeElement.addEventListener('resize', () => {
      const canvas = document.querySelector(
        '#bufferedCanvas'
      ) as HTMLCanvasElement;
      canvas.width = this.video.nativeElement.style.width - 30;
    });

    this.video.nativeElement.addEventListener('playing', (evt: any) => {
      this.lastStartPosition = evt.target.currentTime;
    });

    this.displayControlsEvents();
  }

  displayControlsEvents(): void {
    const videoContainer = document.querySelector(
      '#video-container'
    ) as HTMLDivElement;

    videoContainer.addEventListener('mouseover', (evt: any) => {
      const canvas = document.querySelector(
        '#bufferedCanvas'
      ) as HTMLCanvasElement;
      const controls = document.querySelector('#controls') as HTMLDivElement;
      canvas.style.display = 'block';
      controls.style.display = 'block';
    });

    videoContainer.addEventListener('mouseout', (evt: any) => {
      const canvas = document.querySelector(
        '#bufferedCanvas'
      ) as HTMLCanvasElement;
      const controls = document.querySelector('#controls') as HTMLDivElement;
      canvas.style.display = 'none';
      controls.style.display = 'none';
    });
  }

  playPause(): void {
    if (this.hls) {
      if (!this.video.nativeElement.paused) {
        this.video.nativeElement.pause();
        this.status = 'play_arrow';
        clearInterval(this.interval);
      } else {
        this.video.nativeElement.play();
        this.status = 'pause';
        this.getCurrentTime();
      }
    }
  }

  adjustTime(status: string): void {
    status === '+'
      ? (this.video.nativeElement.currentTime += 10)
      : (this.video.nativeElement.currentTime -= 10);
  }

  next(): void {
    this.index++;
    if (this.index > this.streams.length) {
      this.index = 0;
    }
    this.selectItem(this.index);
  }

  selectItem(idx: number): void {
    this.navigate('/stream', { queryParams: { idx: btoa(idx.toString()) } });
  }

  home(): void {
    this.navigate('/home');
  }

  navigate(page: string, params = {}): void {
    clearInterval(this.hls.bufferTimer);
    clearInterval(this.interval);
    setTimeout(() => {
      this.router.navigate([page], params);
    }, 500);
  }

  getCurrentTime(): void {
    this.interval = setInterval(() => {
      this.video.nativeElement.paused
        ? (this.status = 'play_arrow')
        : (this.status = 'pause');
      this.currentTime = this.format(
        Math.ceil(this.video.nativeElement.currentTime)
      );
      if (this.video.nativeElement.ended) {
        this.next();
      }
    }, 1000);
  }

  checkBuffer(): void {
    const canvas = document.querySelector(
      '#bufferedCanvas'
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    const r = this.video.nativeElement.buffered;
    let bufferingDuration: any;

    if (r) {
      if (
        !canvas.width ||
        canvas.width !== this.video.nativeElement.clientWidth
      ) {
        canvas.width = this.video.nativeElement.clientWidth - 30;
      }
      ctx.fillStyle = 'rgba(225, 225, 225, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const pos = this.video.nativeElement.currentTime;
      let bufferLen = 0;
      ctx.fillStyle = '#f8f8f8';
      for (let i = 0; i < r.length; i++) {
        const start =
          (r.start(i) / this.video.nativeElement.duration) * canvas.width;
        const end =
          (r.end(i) / this.video.nativeElement.duration) * canvas.width;
        ctx.fillRect(start, 0, Math.max(2, end - start), canvas.height);
        if (pos >= r.start(i) && pos < r.end(i)) {
          // play position is inside this buffer TimeRange, retrieve end of buffer position and buffer length
          bufferLen = r.end(i) - pos;
        }
      }
      // check if we are in buffering / or playback ended state
      if (
        bufferLen <= 0.1 &&
        this.video.nativeElement.paused === false &&
        pos - this.lastStartPosition > 0.5
      ) {
        if (this.lastDuration - pos <= 0.5 && this.events.isLive === false) {
          // don't create buffering event if we are at the end of the playlist, don't report ended for live playlist
        } else {
          // we are not at the end of the playlist ... real buffering
          if (this.bufferingIdx !== -1) {
            bufferingDuration =
              performance.now() -
              this.events.t0 -
              this.events.video[this.bufferingIdx].time;
            this.events.video[this.bufferingIdx].duration = bufferingDuration;
            this.events.video[this.bufferingIdx].name = bufferingDuration;
          } else {
            this.events.video.push({
              type: 'buffering',
              time: performance.now() - this.events.t0,
            });
            // we are in buffering state
            this.bufferingIdx = this.events.video.length - 1;
          }
        }
      }

      if (bufferLen > 0.1 && this.bufferingIdx !== -1) {
        bufferingDuration =
          performance.now() -
          this.events.t0 -
          this.events.video[this.bufferingIdx].time;
        this.events.video[this.bufferingIdx].duration = bufferingDuration;
        this.events.video[this.bufferingIdx].name = bufferingDuration;
        // we are out of buffering state
        this.bufferingIdx = -1;
      }

      // update buffer/position for current Time
      const event = {
        time: performance.now() - this.events.t0,
        buffer: Math.round(bufferLen * 1000),
        pos: Math.round(pos * 1000),
      };
      const bufEvents = this.events.buffer;
      const bufEventLen = bufEvents.length;
      if (bufEventLen > 1) {
        const event0 = bufEvents[bufEventLen - 2];
        const event1 = bufEvents[bufEventLen - 1];
        const slopeBuf0 =
          (event0.buffer - event1.buffer) / (event0.time - event1.time);
        const slopeBuf1 =
          (event1.buffer - event.buffer) / (event1.time - event.time);

        const slopePos0 =
          (event0.pos - event1.pos) / (event0.time - event1.time);
        const slopePos1 = (event1.pos - event.pos) / (event1.time - event.time);
        // compute slopes. if less than 30% difference, remove event1
        if (
          (slopeBuf0 === slopeBuf1 ||
            Math.abs(slopeBuf0 / slopeBuf1 - 1) <= 0.3) &&
          (slopePos0 === slopePos1 ||
            Math.abs(slopePos0 / slopePos1 - 1) <= 0.3)
        ) {
          bufEvents.pop();
        }
      }
      this.events.buffer.push(event);

      ctx.fillStyle = 'red';
      const x =
        (this.video.nativeElement.currentTime /
          this.video.nativeElement.duration) *
        canvas.width;
      ctx.fillRect(0, 0, x, 15);
    } else if (ctx.fillStyle !== '#cccccc') {
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  onClickBufferedRange(event: any): void {
    const canvas = document.querySelector(
      '#bufferedCanvas'
    ) as HTMLCanvasElement;
    const target =
      ((event.clientX - canvas.offsetLeft) / canvas.width) *
      this.video.nativeElement.duration;
    this.video.nativeElement.currentTime = target - 10;
  }

  format(time: number): string {
    // tslint:disable:no-bitwise
    const hrs = ~~(time / 3600);
    const mins = ~~((time % 3600) / 60);
    const secs = ~~time % 60;
    let ret = '';
    if (hrs > 0) {
      ret += '' + hrs + ':' + (mins < 10 ? '0' : '');
    }
    ret += '' + mins + ':' + (secs < 10 ? '0' : '');
    ret += '' + secs;
    return ret;
  }
}
