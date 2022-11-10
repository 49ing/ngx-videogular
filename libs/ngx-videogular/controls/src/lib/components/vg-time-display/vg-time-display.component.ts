import {
  Component,
  Input,
  ElementRef,
  OnInit,
  ViewEncapsulation,
  OnDestroy,
  Pipe,
  PipeTransform,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { VgApiService } from '@49ing/ngx-videogular/core';

// Workaround until we can use UTC with Angular Date Pipe
@Pipe({ name: 'vgUtc' })
export class VgUtcPipe implements PipeTransform {
  transform(value: number, format: string): string {
    let date = new Date(value);
    let result = format;
    let ss: string | number = date.getUTCSeconds();
    let mm: string | number = date.getUTCMinutes();
    let hh: string | number = date.getUTCHours();

    if (ss < 10) {
      ss = '0' + ss;
    }
    if (mm < 10) {
      mm = '0' + mm;
    }
    if (hh < 10) {
      hh = '0' + hh;
    }

    result = result.replace(/ss/g, <string>ss);
    result = result.replace(/mm/g, <string>mm);
    result = result.replace(/hh/g, <string>hh);

    return result;
  }
}

@Component({
  selector: 'vg-time-display',
  encapsulation: ViewEncapsulation.None,
  template: `
    <span *ngIf="(target?.isLive || isWebRTC || isHLS) && !ignoreLive">LIVE</span>
    <span *ngIf="!target?.isLive && !isWebRTC && !isHLS">{{
      getTime() | vgUtc: vgFormat
    }}</span>
    <span *ngIf="(isWebRTC || isHLS) && ignoreLive">{{
      getTime() | vgUtc: vgFormat
    }}</span>
    <ng-content></ng-content>
  `,
  styles: [
    `
      vg-time-display {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        display: flex;
        justify-content: center;
        height: 50px;
        width: 60px;
        cursor: pointer;
        color: white;
        line-height: 50px;
        pointer-events: none;
        font-family: Helvetica Neue, Helvetica, Arial, sans-serif;
      }
    `,
  ],
})
export class VgTimeDisplayComponent implements OnInit, OnDestroy {
  @Input() vgFor: string;
  @Input() vgProperty = 'current';
  @Input() vgFormat = 'mm:ss';

  /**
   * We want to ignore live in WebRTC/HLS when we want to display current time
   */
  @Input() ignoreLive: boolean = false;
  @Input() isWebRTC: boolean = false;
  @Input() isHLS: boolean = false;
  @Input() duration: number = 0; // timestamp

  elem: HTMLElement;
  target: any;

  subscriptions: Subscription[] = [];

  constructor(ref: ElementRef, public API: VgApiService) {
    this.elem = ref.nativeElement;
  }

  ngOnInit() {
    if (this.API.isPlayerReady) {
      this.onPlayerReady();
    } else {
      this.subscriptions.push(
        this.API.playerReadyEvent.subscribe(() => this.onPlayerReady())
      );
    }
  }

  onPlayerReady() {
    this.target = this.API.getMediaById(this.vgFor);
  }

  /**
   * In case of WebRTC add duration - how much video is streaming already)
   *
   */
  getTime() {
    let t = 0;

    if (this.target) {
      t = Math.round(this.target.time[this.vgProperty]);
      t = isNaN(t) ? 0 : this.isWebRTC ? this.duration * 1000 : t;
    }

    return t;
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
