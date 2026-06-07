export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 10;
export const MAP_SEARCH_ZOOM = 5;

export const NAVIGATION_CONTROL_OPTIONS = {
  showCompass: false,
  showZoom: true,
  visualizePitch: false,
};

export function create2DMapOptions(container, style) {
  return {
    container,
    style,
    center: [0, 12],
    zoom: 1.4,
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
    bearing: 0,
    pitch: 0,
    minPitch: 0,
    maxPitch: 0,
    pitchWithRotate: false,
    renderWorldCopies: false,
  };
}

export function lockMapTo2D(map) {
  map.dragRotate?.disable?.();
  map.touchPitch?.disable?.();
  map.touchZoomRotate?.disableRotation?.();
  map.keyboard?.disableRotation?.();
  map.setMinPitch?.(0);
  map.setMaxPitch?.(0);

  const enforce2D = () => {
    if (map.getPitch?.() !== 0) {
      map.setPitch?.(0);
    }
    if (map.getBearing?.() !== 0) {
      map.setBearing?.(0);
    }
  };

  enforce2D();

  const events = ["rotate", "rotateend", "pitch", "pitchend"];
  for (const eventName of events) {
    map.on?.(eventName, enforce2D);
  }

  return () => {
    for (const eventName of events) {
      map.off?.(eventName, enforce2D);
    }
  };
}
