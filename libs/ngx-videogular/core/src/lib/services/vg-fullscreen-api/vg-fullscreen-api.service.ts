import { Injectable, EventEmitter, QueryList, HostListener } from '@angular/core';
import { VgUtilsService } from '../vg-utils/vg-utils.service';
import { fromEvent, Subscription } from 'rxjs';
import { VgMediaDirective } from '../../directives/vg-media/vg-media.directive';

@Injectable({
  providedIn: 'root',
})
export class VgFullscreenApiService {
  polyfill: any;
  onchange: string;
  onerror: string;
  nativeFullscreen = true;
  isFullscreen = false;
  isAvailable: boolean;
  videogularElement: HTMLElement;
  medias: QueryList<VgMediaDirective>;

  fsChangeSubscription: Subscription;
  onChangeFullscreen: EventEmitter<any> = new EventEmitter();

  constructor() {}

  init(elem: HTMLElement, medias: QueryList<VgMediaDirective>) {
    this.videogularElement = elem;
    this.medias = medias;

    const APIs = {
      w3: {
        enabled: 'fullscreenEnabled',
        element: 'fullscreenElement',
        request: 'requestFullscreen',
        exit: 'exitFullscreen',
        onchange: 'fullscreenchange',
        onerror: 'fullscreenerror',
      },
      newWebkit: {
        enabled: 'webkitFullscreenEnabled',
        element: 'webkitFullscreenElement',
        request: 'webkitRequestFullscreen',
        exit: 'webkitExitFullscreen',
        onchange: 'webkitfullscreenchange',
        onerror: 'webkitfullscreenerror',
      },
      oldWebkit: {
        enabled: 'webkitIsFullScreen',
        element: 'webkitCurrentFullScreenElement',
        request: 'webkitRequestFullScreen',
        exit: 'webkitCancelFullScreen',
        onchange: 'webkitfullscreenchange',
        onerror: 'webkitfullscreenerror',
      },
      moz: {
        enabled: 'mozFullScreen',
        element: 'mozFullScreenElement',
        request: 'mozRequestFullScreen',
        exit: 'mozCancelFullScreen',
        onchange: 'mozfullscreenchange',
        onerror: 'mozfullscreenerror',
      },
      ios: {
        enabled: 'webkitFullscreenEnabled',
        element: 'webkitFullscreenElement',
        request: 'webkitEnterFullscreen',
        exit: 'webkitExitFullscreen',
        onchange: 'webkitendfullscreen', // Hack for iOS: webkitfullscreenchange it's not firing
        onerror: 'webkitfullscreenerror',
      },
      ms: {
        enabled: 'msFullscreenEnabled',
        element: 'msFullscreenElement',
        request: 'msRequestFullscreen',
        exit: 'msExitFullscreen',
        onchange: 'MSFullscreenChange',
        onerror: 'MSFullscreenError',
      },
    };

    for (const browser in APIs) {
      if (APIs[browser].enabled in document) {
        this.polyfill = APIs[browser];
        break;
      }
    }

    if (VgUtilsService.isiOSDevice() && !VgUtilsService.isIpadOS()) {
      this.polyfill = APIs.ios;
    }

    this.isAvailable = this.polyfill != null;

    if (this.polyfill == null) {
      return;
    }

    let fsElemDispatcher: HTMLElement | Document;

    switch (this.polyfill.onchange) {
      // Mozilla dispatches the fullscreen change event from document, not the element
      // See: https://bugzilla.mozilla.org/show_bug.cgi?id=724816#c3
      case 'mozfullscreenchange':
        fsElemDispatcher = document;
        break;

      // iOS dispatches the fullscreen change event from video element
      case 'webkitendfullscreen':
        fsElemDispatcher = this.medias.toArray()[0].elem;
        break;

      // HTML5 implementation dispatches the fullscreen change event from the element
      default:
        fsElemDispatcher = elem;
    }

    this.fsChangeSubscription = fromEvent(
      fsElemDispatcher,
      this.polyfill.onchange
    ).subscribe(() => {
      this.onFullscreenChange();
    });
  }

  onFullscreenChange() {
    this.isFullscreen = !!document[this.polyfill.element];
    this.onChangeFullscreen.emit(this.isFullscreen);
  }

  changeFullscreen(isFullscreen: boolean) {
    this.isFullscreen = isFullscreen;
    this.onChangeFullscreen.emit(isFullscreen);
  }

  async toggleFullscreen(element: any = null) {
    if (this.isFullscreen) {
      await this.exit();
    } else {
      await this.request(element);
    }
  }

  async request(elem: any) {
    if (!elem) {
      elem = this.videogularElement;
    }

    // Perform native full screen support
    if (this.isAvailable && this.nativeFullscreen) {
      // Fullscreen for mobile devices
      if (VgUtilsService.isMobileDevice() && !VgUtilsService.isIpadOS()) {
        // We should make fullscreen the video object if it doesn't have native fullscreen support
        // Fallback! We can't set vg-player on fullscreen, only video/audio objects
        if (
          (!this.polyfill.enabled && elem === this.videogularElement) ||
          VgUtilsService.isiOSDevice()
        ) {
          elem = this.medias.toArray()[0].elem;
        }

        await this.enterElementInFullScreen(elem);
      } else {
        await this.enterElementInFullScreen(this.videogularElement);
      }
    }

    this.isFullscreen = true;
    this.onChangeFullscreen.emit(true);
  }

  async enterElementInFullScreen(elem: any) {
    // Check if the element exists and is not null
    if (!elem) {
      console.error("Element is not defined or null.");
      return;
    }

    // Ensure `this.polyfill.request` is correctly defined and a function
    if (typeof this.polyfill.request !== 'function') {
      console.error("Fullscreen request method is not correctly defined or not supported.");
      return;
    }

    try {
      // Await the fullscreen request
      await this.polyfill.request.call(elem);
    } catch (error) {
      console.error("Error entering fullscreen:", error);
      // Do not rethrow the error
    }
}

  async exit() {
    this.isFullscreen = false;
    this.onChangeFullscreen.emit(false);

    // Check if the document is currently in fullscreen mode
    if (this.isAvailable && this.nativeFullscreen && document[this.polyfill.element]) {
      try {
        // Ensure `this.polyfill.exit` is correctly defined and a function
        if (typeof this.polyfill.exit !== 'function') {
          console.error("Fullscreen exit method is not correctly defined or not supported.");
          return;
        }
        // Exit from native fullscreen
        await this.polyfill.exit.call(document);
      } catch (error) {
        console.error("Error exiting fullscreen:", error);
      }
    }
  }

  @HostListener('document:fullscreenerror', ['$event'])
  onFullscreenerror(event: Event) {
    this.isFullscreen = false;
    this.onChangeFullscreen.emit(false);
  }
}
