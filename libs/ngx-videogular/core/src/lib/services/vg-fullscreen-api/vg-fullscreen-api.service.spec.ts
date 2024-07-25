import { QueryList } from '@angular/core';
import { VgFullscreenApiService } from './vg-fullscreen-api.service';
import { VgUtilsService } from '../vg-utils/vg-utils.service';

describe('Videogular Player', () => {
  let medias: QueryList<any>;
  let elem: HTMLElement;
  let fsAPI: VgFullscreenApiService;

  beforeEach(() => {
    medias = new QueryList();
    elem = document.createElement('video');

    fsAPI = new VgFullscreenApiService();
    fsAPI.isAvailable = true;
    fsAPI.nativeFullscreen = true;
    fsAPI.init(elem, medias);
  });

  it('Should create polyfills on init', () => {
    expect(fsAPI.polyfill.enabled).toBe('fullscreenEnabled');
    expect(fsAPI.polyfill.element).toBe('fullscreenElement');
    expect(fsAPI.polyfill.request).toBe('requestFullscreen');
    expect(fsAPI.polyfill.exit).toBe('exitFullscreen');
    expect(fsAPI.polyfill.onchange).toBe('fullscreenchange');
    expect(fsAPI.polyfill.onerror).toBe('fullscreenerror');
  });

  it('Should request an element to enter in fullscreen mode (desktop)', async () => {
    spyOn(fsAPI, 'enterElementInFullScreen').and.callFake(async () => {});

    await fsAPI.request(null);

    expect(fsAPI.isFullscreen).toBeTruthy();
    expect(await fsAPI.enterElementInFullScreen).toHaveBeenCalledWith(elem);
  });

  it('Should request an element to enter in fullscreen mode (mobile)', async () => {
    spyOn(VgUtilsService, 'isMobileDevice').and.callFake(() => {
      return true;
    });
    spyOn(fsAPI, 'enterElementInFullScreen').and.callFake(async () => {});

    await fsAPI.request(null);

    expect(fsAPI.isFullscreen).toBeTruthy();
    expect(VgUtilsService.isMobileDevice).toHaveBeenCalled();
    expect(await fsAPI.enterElementInFullScreen).toHaveBeenCalledWith(elem);
  });

  it('Should request an element to enter in fullscreen mode (mobile with param elem)', async () => {
    spyOn(VgUtilsService, 'isMobileDevice').and.callFake(() => {
      return true;
    });
    spyOn(fsAPI, 'enterElementInFullScreen').and.callFake(async () => {});

    await fsAPI.request(elem);

    expect(fsAPI.isFullscreen).toBeTruthy();
    expect(VgUtilsService.isMobileDevice).toHaveBeenCalled();
    expect(await fsAPI.enterElementInFullScreen).toHaveBeenCalledWith(elem);
  });

  it('Should not request an element to enter in fullscreen mode', async () => {
    spyOn(fsAPI, 'enterElementInFullScreen').and.callFake(async () => {});

    fsAPI.nativeFullscreen = false;
    await fsAPI.request(elem);

    expect(await fsAPI.enterElementInFullScreen).not.toHaveBeenCalled();
  });

  it('Should enter in fullscreen mode', async () => {
    // Create a new element
    const elem = document.createElement('div');
  
    // Append the element to the DOM
    document.body.appendChild(elem);
  
    // Mock the requestFullscreen method
    const requestFullscreenSpy = spyOn(elem as any, 'requestFullscreen').and.callFake(() => {
      return new Promise<void>((resolve) => {
        resolve();
      });
    });
  
    // Set the polyfill to use the mock method
    fsAPI.polyfill = {
      request: 'requestFullscreen'
    };
    // Call the fullscreen function
    await fsAPI.enterElementInFullScreen(elem);
  
    // Assert that the requestFullscreen method was called
    expect(requestFullscreenSpy).toHaveBeenCalled();
  
    // Clean up by removing the element from the DOM
    document.body.removeChild(elem);
  });

  it('Should request an element to exit from fullscreen mode (native)', async () => {
    // Create a spy function for exiting fullscreen
    const mockedExitFunction = jasmine.createSpy('mockedExitFunction').and.callFake(() => {
      return new Promise<void>((resolve) => {
        resolve();
      });
    });
    
    // Set up the polyfill to use the mocked function
    fsAPI.polyfill = {
      exit: 'mockedExitFunction',
      element: 'mockedElement'
    };

    // Mock the document's exit function to use the spy
    (document as any).mockedExitFunction = mockedExitFunction;
    
    // Mock the element check to return true
    (document as any).mockedElement = true;

    // Call the exit method
    await fsAPI.exit();

    // Check if fullscreen mode has been exited
    expect(fsAPI.isFullscreen).toBeFalsy();
    
    // Verify that the mocked exit function was called
    expect(mockedExitFunction).toHaveBeenCalled();
  });

  it('Should request an element to exit from fullscreen mode (emulated)', async () => {
    fsAPI.polyfill.exit = 'mockedExitFunction';

    (document as any).mockedExitFunction = () => {};

    spyOn(document, 'mockedExitFunction' as any).and.callThrough();

    fsAPI.nativeFullscreen = false;
    await fsAPI.exit();

    expect(fsAPI.isFullscreen).toBeFalsy();
    expect((document as any).mockedExitFunction).not.toHaveBeenCalled();
  });

  it('Should enter videogular element to fullscreen mode', async () => {
    fsAPI.videogularElement = { id: 'vgElem' } as HTMLElement;

    spyOn(fsAPI, 'request').and.callFake(async() => {});

    await fsAPI.toggleFullscreen();

    expect(fsAPI.request).toHaveBeenCalledWith(null);
  });

  it('Should enter other element to fullscreen mode', async () => {
    const element = { id: 'main' };

    fsAPI.videogularElement = { id: 'vgElem' } as HTMLElement;

    spyOn(fsAPI, 'request').and.callFake(async() => {});

    await fsAPI.toggleFullscreen(element);

    expect(fsAPI.request).toHaveBeenCalledWith(element);
  });

  it('Should exit from fullscreen mode', async () => {
    fsAPI.isFullscreen = true;

    spyOn(fsAPI, 'exit').and.callFake(async () => {});

    await fsAPI.toggleFullscreen();

    expect(fsAPI.exit).toHaveBeenCalled();
  });
});
