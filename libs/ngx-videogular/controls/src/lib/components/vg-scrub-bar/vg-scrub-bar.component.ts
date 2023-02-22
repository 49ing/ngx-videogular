import {
  Component,
  ElementRef,
  Input,
  EventEmitter,
  HostListener,
  OnInit,
  ViewEncapsulation,
  HostBinding,
  OnDestroy,
  Output,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { VgControlsHiddenService, VgApiService, VgStates } from '@49ing/ngx-videogular/core';

@Component({
  selector: 'vg-scrub-bar',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div
      class="scrubBar"
      tabindex="0"
      role="slider"
      aria-label="scrub bar"
      aria-level="polite"
      [attr.aria-valuenow]="getPercentage()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuetext]="getPercentage()"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      vg-scrub-bar {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        position: absolute;
        width: 100%;
        height: 5px;
        bottom: 50px;
        margin: 0;
        cursor: pointer;
        align-items: center;
        background: rgba(0, 0, 0, 0.75);
        z-index: 250;
        -webkit-transition: bottom 1s, opacity 0.5s;
        -khtml-transition: bottom 1s, opacity 0.5s;
        -moz-transition: bottom 1s, opacity 0.5s;
        -ms-transition: bottom 1s, opacity 0.5s;
        transition: bottom 1s, opacity 0.5s;
      }
      vg-scrub-bar .scrubBar {
        position: relative;
        display: flex;
        flex-grow: 1;
        align-items: center;
        height: 100%;
      }
      vg-controls vg-scrub-bar {
        position: relative;
        bottom: 0;
        background: transparent;
        height: 50px;
        flex-grow: 1;
        flex-basis: 0;
        margin: 0 10px;
        -webkit-transition: initial;
        -khtml-transition: initial;
        -moz-transition: initial;
        -ms-transition: initial;
        transition: initial;
      }
      vg-scrub-bar.hide {
        bottom: 0;
        opacity: 0;
      }
      vg-controls vg-scrub-bar.hide {
        bottom: initial;
        opacity: initial;
      }
    `,
  ],
})
export class VgScrubBarComponent implements OnInit, OnDestroy {
  @HostBinding('class.hide') hideScrubBar = false;

  @Input() disabled = false;
  @Input() vgFor: string;
  @Input() vgSlider = true;
  @Input() livePosition: number = 0;

  elem: HTMLElement;
  target: any;
  isSeeking = false;
  wasPlaying = false;

  subscriptions: Subscription[] = [];

  /**
   * Seekable stream required for seeking
   */
  @Output() switchChannel: EventEmitter<number> = new EventEmitter();
  @Output() seeking: EventEmitter<boolean> = new EventEmitter();

  constructor(
    ref: ElementRef,
    public API: VgApiService,
    vgControlsHiddenState: VgControlsHiddenService
  ) {
    this.elem = ref.nativeElement;
    this.subscriptions.push(
      vgControlsHiddenState.isHidden.subscribe((hide) =>
        this.onHideScrubBar(hide)
      )
    );
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

    if (!this.target) {
      return;
    }

    this.target.subscriptions.loadedMetadata.subscribe((e) => {
        // Set init seek back live duration
        this.target.capturedSeekBackLiveDuration = this.target.duration;
      });
  }

  protected seekStart(offset: number) {
    if (this.isWebRTC()) {
      const percentage = Math.max(
        Math.min((offset * 100) / this.elem.scrollWidth, 99.9),

        0
      );

      this.target.pause();

      this.switchChannel.emit(percentage);

      return;
    }

    if (this.target.canPlay) {
      this.isSeeking = true;
      this.seeking.emit(this.isSeeking);
      if (this.target.state === VgStates.VG_PLAYING) {
        this.wasPlaying = true;
      }
      this.target.pause();
    }
  }

  protected seekMove(offset: number) {
    if (this.isSeeking) {
      const percentage = Math.max(
        Math.min((offset * 100) / this.getWidth(), 99.9),
        0
      );
      this.target.time.current = (percentage * this.getTotalTime()) / 100;
      this.seekTime(percentage);
    }
  }

  protected captureSeekBackLiveDuration() {
    if (this.isLiveTime()) {
      this.target.capturedSeekBackLiveDuration = this.target.duration;
    }
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

  protected seekEnd(offset: number) {
    this.isSeeking = false;
    this.seeking.emit(this.isSeeking);
    if (this.target.canPlay) {
      const percentage = Math.max(
        Math.min((offset * 100) / this.getWidth(), 99.9),
        0
      );
      this.seekTime(percentage);

      if (this.wasPlaying) {
        this.wasPlaying = false;
        this.target.play();
      }
    }
  }

  protected getWidth(): number {
    /*
     In live mode scrollWidth
     has hidden overflow and that's why we have
     bad percentage calculation
    */
    if (!this.target.isLive && !this.target.elem?.src.includes('blob')) {
      return this.elem.scrollWidth;
    } else {
      return this.elem.clientWidth;
    }
  }

  protected seekTime(percentage: number): void {
    if (!this.target.isLive) {
      // Regular calculation
      this.target.seekTime(percentage, true);
    } else {
      if (this.isLiveTime()) {
        // Regular calculation
        this.target.seekTime(percentage, true);
      } else {
        /*
         * In live mode when we seek back we need to use captured
         * duration at that moment and do division with that duration time
         */
        const currentTime =
          percentage * this.target?.capturedSeekBackLiveDuration * 10;
        this.target.time.current = currentTime;
        this.target.seekTime(currentTime / 1000, false);
      }
    }
  }

  protected touchEnd() {
    this.isSeeking = false;
    this.seeking.emit(this.isSeeking);
    if (this.wasPlaying) {
      this.wasPlaying = false;
      this.target.play();
    }
  }

  protected getTouchOffset(event: any) {
    let offsetLeft = 0;
    let element: any = event.target;
    while (element) {
      offsetLeft += element.offsetLeft;
      element = element.offsetParent;
    }
    return event.touches[0].pageX - offsetLeft;
  }

  @HostListener('mousedown', ['$event'])
  onMouseDownScrubBar($event: any) {
    if (this.target && !this.disabled) {
      if (this.target.isLive) {
        this.captureSeekBackLiveDuration();
      }
      if (!this.vgSlider) {
        this.seekEnd($event.offsetX);
      } else {
        this.seekStart($event.offsetX);
      }
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMoveScrubBar($event: any) {
    if (this.target) {
      if (this.target.isLive) {
        this.captureSeekBackLiveDuration();
      }
      if (this.vgSlider && this.isSeeking) {
        this.seekMove($event.offsetX);
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUpScrubBar($event: any) {
    if (this.target) {
      if (this.target.isLive) {
        this.captureSeekBackLiveDuration();
      }
      if (this.vgSlider && this.isSeeking) {
        this.seekEnd($event.offsetX);
      }
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStartScrubBar($event: any) {
    if (this.target && !this.disabled) {
      if (this.target.isLive) {
        this.captureSeekBackLiveDuration();
      }
      if (!this.vgSlider) {
        this.seekEnd(this.getTouchOffset($event));
      } else {
        this.seekStart(this.getTouchOffset($event));
      }
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMoveScrubBar($event: any) {
    if (this.target) {
      if (this.target.isLive) {
        this.captureSeekBackLiveDuration();
      }
      if (this.vgSlider && this.isSeeking) {
        this.seekMove(this.getTouchOffset($event));
      }
    }
  }
  // @ts-ignore
  @HostListener('document:touchcancel', ['$event']) onTouchCancelScrubBar(
    _$event: any
  ) {
    if (this.target) {
      if (this.vgSlider && this.isSeeking) {
        this.touchEnd();
      }
    }
  }
  // @ts-ignore
  @HostListener('document:touchend', ['$event']) onTouchEndScrubBar(
    _$event: any
  ) {
    if (this.target) {
      if (this.vgSlider && this.isSeeking) {
        this.touchEnd();
      }
    }
  }

  /** Original code have this function but there is no point to have something like this
   *  inside vg-scrub-bar for us since we manipulate seek time.
   *  Plus naming (arrowAdjustVolume) in library is completely wrong.
   *
   * @HostListener('keydown', ['$event'])
   * arrowAdjustVolume(event: KeyboardEvent) {
   *  if (this.target) {
   *    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
   *      event.preventDefault();
   *      this.target.seekTime((this.target.time.current + 5000) / 1000, false);
   *    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
   *      event.preventDefault();
   *      this.target.seekTime((this.target.time.current - 5000) / 1000, false);
   *    }
   *  }
   * }
   */

  isLiveTime() {
    if (this.target && this.target.isLive) {
      return this.target.time.current >= this.livePosition * 1000;
    }
  }

  getPercentage() {
    if (this.target) {
      return (
        Math.round((this.target.time.current * 100) / this.getTotalTime()) + '%'
      );
    } else {
      return '0%';
    }
  }

  onHideScrubBar(hide: boolean) {
    this.hideScrubBar = hide;
  }

  private isWebRTC() {
    const target = this.API.getDefaultMedia();
    const video = document.getElementById(target?.id) as HTMLVideoElement;
    return video?.id.startsWith('video-webrtc-');
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
