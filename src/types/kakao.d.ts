declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
    getLevel(): number;
    addControl(control: ZoomControl, position: ControlPosition): void;
  }
  class LatLng {
    constructor(lat: number, lng: number);
  }
  class Marker {
    constructor(options: { position: LatLng; image?: MarkerImage });
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }
  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }
  class Size {
    constructor(width: number, height: number);
  }
  class Point {
    constructor(x: number, y: number);
  }
  class InfoWindow {
    constructor(options: { content: string; removable?: boolean });
    open(map: Map, marker: Marker): void;
    close(): void;
  }
  class CustomOverlay {
    constructor(options: {
      content: string | HTMLElement;
      position: LatLng;
      yAnchor?: number;
      xAnchor?: number;
    });
    setMap(map: Map | null): void;
  }
  class ZoomControl {}
  const ControlPosition: {
    RIGHT: number;
    LEFT: number;
    TOP: number;
    BOTTOM: number;
    TOPRIGHT: number;
    TOPLEFT: number;
    BOTTOMRIGHT: number;
    BOTTOMLEFT: number;
  };
  namespace event {
    function addListener(
      target: kakao.maps.Map | kakao.maps.Marker,
      type: string,
      handler: (...args: unknown[]) => void
    ): void;
  }
  function load(callback: () => void): void;
}

declare namespace kakao.maps.services {
  class MarkerClusterer {
    constructor(options: {
      map: kakao.maps.Map;
      markers?: kakao.maps.Marker[];
      gridSize?: number;
      minLevel?: number;
      minClusterSize?: number;
      calculator?: number[];
      styles?: object[];
    });
    clear(): void;
    addMarkers(markers: kakao.maps.Marker[]): void;
  }
}
