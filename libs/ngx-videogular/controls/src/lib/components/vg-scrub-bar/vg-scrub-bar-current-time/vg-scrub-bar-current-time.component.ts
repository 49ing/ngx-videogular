import {
  Component,
  Input,
  ElementRef,
  OnInit,
  ViewEncapsulation,
  OnDestroy
} from '@angular/core';
import { Subscription } from 'rxjs';
import { VgApiService } from '@49ing/ngx-videogular/core';

@Component({
  selector: 'vg-scrub-bar-current-time',
  encapsulation: ViewEncapsulation.None,
  template: `<div class="background" [style.width]="getPercentage()"></div>
    <span class="slider" *ngIf="vgSlider"></span>`,
  styles: [
    `
      vg-scrub-bar-current-time {
        display: flex;
        width: 100%;
        height: 5px;
        pointer-events: none;
        position: absolute;
      }
      vg-scrub-bar-current-time .background {
        background-color: white;
      }
      vg-controls vg-scrub-bar-current-time {
        position: absolute;
        top: calc(50% - 3px);
        -webkit-border-radius: 2px;
        -moz-border-radius: 2px;
        border-radius: 2px;
      }
      vg-controls vg-scrub-bar-current-time .background {
        border: 1px solid white;
        -webkit-border-radius: 2px;
        -moz-border-radius: 2px;
        border-radius: 2px;
      }
      vg-scrub-bar-current-time .slider {
        background: white;
        height: 15px;
        width: 15px;
        border-radius: 50%;
        box-shadow: 0px 0px 10px black;
        margin-top: -5px;
        margin-left: -10px;
      }
    `,
  ],
})
export class VgScrubBarCurrentTimeComponent implements OnInit, OnDestroy {
  @Input() vgFor: string;
  @Input() vgSlider = false;

  @Input() livePosition: number = 0;

  @Input() isWebRTC: boolean;

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

  protected getTotalTime() {
    if (!this.target.isLive) {
      return this.target.time.total;
    } else {
      if (this.isLiveTime()) {
        /*
         * In live mode we need to check duration because
         * time total is not live updated
         */
        return this.target.duration * 1000;
      } else {
        /*
         * In live mode when we seek back we need to use captured
         * duration at that moment and do division with that duration time
         */
        return (
          (this.target?.capturedSeekBackLiveDuration ?? this.target.duration) *
          1000
        );
      }
    }
  }

  isLiveTime() {
    if (this.target && this.target.isLive) {
      return this.target.time.current >= this.livePosition * 1000;
    }
  }

  /**
   * In case of WebRTC return 100%
   */
  getPercentage() {
    if (this.isWebRTC) {
      return '100%';
    } else if (this.target) {
      return (
        Math.min(
          Math.round((this.target.time.current * 100) / this.getTotalTime()),
          100
        ) + '%'
      );
    } else {
      return '0%';
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
