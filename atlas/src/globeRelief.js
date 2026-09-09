// Decorative screen geometry only. The atlas locks pitch/roll to zero, so the
// globe's perspective silhouette is a circle. Use the public camera APIs;
// never alter its pose, its geographic data, or its picking layers.
export function globeScreenCircle(map) {
  if (map.getProjection()?.type !== "globe" || map.getPitch() !== 0 || map.getRoll() !== 0) return null;
  const { clientWidth: width, clientHeight: height } = map.getCanvas();
  if (!(width > 0 && height > 0)) return null;
  const center = map.getCenter();
  const point = map.project(center); // also respects the renderer's padding
  const latitude = center.lat * Math.PI / 180;
  const distance = height / (2 * Math.tan(map.getVerticalFieldOfView() * Math.PI / 360));
  const sphereRadius = 512 * 2 ** map.getZoom() / (2 * Math.PI * Math.cos(latitude));
  const radius = sphereRadius * distance / Math.sqrt(distance ** 2 + 2 * distance * sphereRadius);
  if (![point.x, point.y, radius].every(Number.isFinite) || radius <= 0) return null;
  // At street/detail zoom the limb is outside the aperture. Do not allocate
  // an enormous offscreen shadow/gradient when none of its edge can be seen.
  const furthestCorner = Math.max(...[[0, 0], [width, 0], [0, height], [width, height]]
    .map(([x, y]) => Math.hypot(x - point.x, y - point.y)));
  if (radius > furthestCorner + 128) return null;
  return { x: point.x, y: point.y, radius };
}

export function observeGlobeRelief(map) {
  const canvas = map.getCanvas();
  const element = canvas.ownerDocument.createElement("div");
  element.className = "globe-relief";
  element.setAttribute("aria-hidden", "true");
  element.inert = true;
  element.hidden = true;
  // Keep the cast/rim above the basemap but below DOM markers and popups.
  // Using the canvas's own container follows both atlas and square apertures.
  canvas.insertAdjacentElement("afterend", element);
  let lastGeometry = "";
  const update = () => {
    try {
      const circle = globeScreenCircle(map);
      element.hidden = !circle;
      if (!circle) return;
      const { x, y, radius } = circle;
      const geometry = [x, y, radius].map((value) => value.toFixed(2)).join(",");
      if (geometry === lastGeometry) return;
      lastGeometry = geometry;
      element.style.width = `${radius * 2}px`;
      element.style.height = `${radius * 2}px`;
      element.style.transform = `translate(${x - radius}px, ${y - radius}px)`;
      element.style.setProperty("--globe-relief-unit", `${Math.max(6, Math.min(22, radius * 0.035))}px`);
    } catch {
      // A missing style during a lamp change should remove decoration, not
      // turn a cosmetic treatment into a map failure.
      element.hidden = true;
    }
  };
  map.on("render", update);
  update();
  return () => { map.off("render", update); element.remove(); };
}
