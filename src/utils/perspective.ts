export interface Point {
  x: number;
  y: number;
}

export interface Polyline {
  points: Point[];
  closed: boolean;
}

export interface ShapeDefinition {
  id: string;
  polylines: Polyline[];
  attributes: Record<string, string>;
}

export interface ParsedSvg {
  width: number;
  height: number;
  viewBox: { x: number; y: number; width: number; height: number };
  shapes: ShapeDefinition[];
}

const COMMAND_RE = /[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g;

interface PathCommand {
  type: string;
  relative: boolean;
  values: number[];
}

const DEFAULT_ATTRS = ["fill", "stroke", "stroke-width", "fill-opacity", "stroke-opacity", "stroke-linejoin", "stroke-linecap", "stroke-dasharray", "stroke-dashoffset", "fill-rule", "style"];

export class SvgPerspectiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SvgPerspectiveError";
  }
}

export function parseSvgMarkup(markup: string, quality: number): ParsedSvg {
  const parser = new DOMParser();
  const doc = parser.parseFromString(markup, "image/svg+xml");
  const svg = doc.querySelector("svg");

  if (!svg) {
    throw new SvgPerspectiveError("No <svg> element found in markup.");
  }

  const viewBoxAttr = svg.getAttribute("viewBox");
  let viewBox = { x: 0, y: 0, width: 0, height: 0 };

  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/\s+|,/).map(Number);
    viewBox = {
      x: parts[0] || 0,
      y: parts[1] || 0,
      width: parts[2] || 0,
      height: parts[3] || 0,
    };
  } else {
    const width = Number(svg.getAttribute("width")) || 0;
    const height = Number(svg.getAttribute("height")) || 0;
    viewBox = { x: 0, y: 0, width, height };
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  if (viewBox.width === 0 || viewBox.height === 0) {
    throw new SvgPerspectiveError("Unable to determine SVG dimensions.");
  }

  const shapes: ShapeDefinition[] = [];

  const processElement = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    const attrs: Record<string, string> = {};
    DEFAULT_ATTRS.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (value !== null) attrs[attr] = value;
    });

    const id = element.getAttribute("id") ?? `${tag}-${shapes.length}`;

    if (tag === "path") {
      const d = element.getAttribute("d");
      if (!d) return;
      const polylines = flattenPathData(d, quality);
      if (polylines.length) shapes.push({ id, polylines, attributes: attrs });
      return;
    }

    if (tag === "rect") {
      const x = parseFloat(element.getAttribute("x") || "0");
      const y = parseFloat(element.getAttribute("y") || "0");
      const width = parseFloat(element.getAttribute("width") || "0");
      const height = parseFloat(element.getAttribute("height") || "0");
      if (!width || !height) return;
      const rx = parseFloat(element.getAttribute("rx") || "0");
      const ry = parseFloat(element.getAttribute("ry") || "0");
      if (rx > 0 || ry > 0) {
        const path = roundedRectPath(x, y, width, height, rx || ry);
        const polylines = flattenPathData(path, quality);
        shapes.push({ id, polylines, attributes: attrs });
      } else {
        const points = [
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
        ];
        shapes.push({ id, polylines: [{ points, closed: true }], attributes: attrs });
      }
      return;
    }

    if (tag === "circle" || tag === "ellipse") {
      const cx = parseFloat(element.getAttribute("cx") || "0");
      const cy = parseFloat(element.getAttribute("cy") || "0");
      const rx = tag === "circle"
        ? parseFloat(element.getAttribute("r") || "0")
        : parseFloat(element.getAttribute("rx") || "0");
      const ry = tag === "circle"
        ? parseFloat(element.getAttribute("r") || "0")
        : parseFloat(element.getAttribute("ry") || "0");
      if (!rx || !ry) return;
      const points = approximateEllipse(cx, cy, rx, ry, quality);
      shapes.push({ id, polylines: [{ points, closed: true }], attributes: attrs });
      return;
    }

    if (tag === "line") {
      const x1 = parseFloat(element.getAttribute("x1") || "0");
      const y1 = parseFloat(element.getAttribute("y1") || "0");
      const x2 = parseFloat(element.getAttribute("x2") || "0");
      const y2 = parseFloat(element.getAttribute("y2") || "0");
      const points = [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ];
      shapes.push({ id, polylines: [{ points, closed: false }], attributes: attrs });
      return;
    }

    if (tag === "polyline" || tag === "polygon") {
      const pointsAttr = element.getAttribute("points");
      if (!pointsAttr) return;
      const coords = pointsAttr.trim().split(/\s+|,/).map(Number);
      const points: Point[] = [];
      for (let i = 0; i < coords.length; i += 2) {
        const x = coords[i];
        const y = coords[i + 1];
        if (Number.isFinite(x) && Number.isFinite(y)) {
          points.push({ x, y });
        }
      }
      if (points.length >= 2) {
        shapes.push({ id, polylines: [{ points, closed: tag === "polygon" }], attributes: attrs });
      }
      return;
    }
  };

  const candidates = svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon");
  candidates.forEach((el) => processElement(el));

  if (!shapes.length) {
    throw new SvgPerspectiveError("No supported vector elements found in SVG.");
  }

  return {
    width: viewBox.width,
    height: viewBox.height,
    viewBox,
    shapes,
  };
}

export function flattenPathData(d: string, quality: number): Polyline[] {
  const commands = parsePath(d);
  const polylines: Polyline[] = [];
  let current: Point = { x: 0, y: 0 };
  let startPoint: Point = { x: 0, y: 0 };
  let pending: Point[] = [];
  let lastCubicControl: Point | null = null;
  let lastQuadraticControl: Point | null = null;

  const pushPending = (closed = false) => {
    if (pending.length > 1) {
      polylines.push({ points: pending.slice(), closed });
    }
    pending = [];
    lastCubicControl = null;
    lastQuadraticControl = null;
  };

  commands.forEach((cmd) => {
    const type = cmd.type;
    switch (type) {
      case "M": {
        pushPending();
        current = { x: cmd.values[0], y: cmd.values[1] };
        startPoint = { ...current };
        pending.push({ ...current });
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case "L": {
        current = { x: cmd.values[0], y: cmd.values[1] };
        pending.push({ ...current });
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case "H": {
        current = { x: cmd.values[0], y: current.y };
        pending.push({ ...current });
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case "V": {
        current = { x: current.x, y: cmd.values[0] };
        pending.push({ ...current });
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case "C": {
        const [x1, y1, x2, y2, x, y] = cmd.values;
        const steps = Math.max(2, quality * 3);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const point = cubicBezierPoint(current, { x: x1, y: y1 }, { x: x2, y: y2 }, { x, y }, t);
          pending.push(point);
        }
        current = { x, y };
        lastCubicControl = { x: x2, y: y2 };
        lastQuadraticControl = null;
        break;
      }
      case "S": {
        const [x2, y2, x, y] = cmd.values;
        const mirror = mirrorControlPoint(lastCubicControl, current);
        const steps = Math.max(2, quality * 3);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const point = cubicBezierPoint(current, mirror, { x: x2, y: y2 }, { x, y }, t);
          pending.push(point);
        }
        current = { x, y };
        lastCubicControl = { x: x2, y: y2 };
        lastQuadraticControl = null;
        break;
      }
      case "Q": {
        const [x1, y1, x, y] = cmd.values;
        const steps = Math.max(2, quality * 2);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const point = quadraticBezierPoint(current, { x: x1, y: y1 }, { x, y }, t);
          pending.push(point);
        }
        current = { x, y };
        lastQuadraticControl = { x: x1, y: y1 };
        lastCubicControl = null;
        break;
      }
      case "T": {
        const [x, y] = cmd.values;
        const mirror = mirrorControlPoint(lastQuadraticControl, current);
        const steps = Math.max(2, quality * 2);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const point = quadraticBezierPoint(current, mirror, { x, y }, t);
          pending.push(point);
        }
        current = { x, y };
        lastQuadraticControl = mirror;
        lastCubicControl = null;
        break;
      }
      case "A": {
        const [rx, ry, angle, largeFlag, sweepFlag, x, y] = cmd.values;
        const arcPoints = approximateArc(current, { x, y }, rx, ry, angle, largeFlag, sweepFlag, quality * 4);
        arcPoints.forEach((point) => pending.push(point));
        current = { x, y };
        lastCubicControl = null;
        lastQuadraticControl = null;
        break;
      }
      case "Z": {
        pending.push({ ...startPoint });
        pushPending(true);
        break;
      }
    }
  });

  pushPending();
  return polylines;
}

function parsePath(d: string): PathCommand[] {
  const tokens = d.match(COMMAND_RE);
  if (!tokens) return [];
  const commands: PathCommand[] = [];
  let index = 0;
  let currentCommand = "";

  const paramCounts: Record<string, number> = {
    M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/[a-zA-Z]/.test(token)) {
      currentCommand = token;
      index++;
    } else if (!currentCommand) {
      break;
    }

    const type = currentCommand.toUpperCase();
    if (type === "Z") {
      commands.push({ type: "Z", relative: false, values: [] });
      currentCommand = "";
      continue;
    }

    const paramCount = paramCounts[type];
    const values: number[] = [];
    for (let i = 0; i < paramCount; i++) {
      const value = parseFloat(tokens[index++]);
      values.push(value);
    }

    const isRelative = currentCommand === currentCommand.toLowerCase();
    commands.push({ type, relative: isRelative, values });
    if (type === "M") currentCommand = isRelative ? "l" : "L";
  }

  return absolutize(commands);
}

function absolutize(commands: PathCommand[]): PathCommand[] {
  let current: Point = { x: 0, y: 0 };
  let subpathStart: Point = { x: 0, y: 0 };
  return commands.map((cmd) => {
    const { type, relative, values } = cmd;
    if (!relative || type === "Z") {
      if (type === "M") {
        current = { x: values[0], y: values[1] };
        subpathStart = { ...current };
      } else if (type === "Z") {
        current = { ...subpathStart };
      } else {
        updateCurrent(type, values, current);
      }
      return cmd;
    }

    const absValues = convertToAbsolute(type, values, current);
    const absoluteCommand: PathCommand = { type, relative: false, values: absValues };
    updateCurrent(type, absValues, current);
    if (type === "M") {
      subpathStart = { ...current };
    }
    return absoluteCommand;
  });
}

function convertToAbsolute(type: string, values: number[], current: Point): number[] {
  const abs = [...values];
  switch (type) {
    case "M":
    case "L":
    case "T":
      abs[0] += current.x;
      abs[1] += current.y;
      break;
    case "H":
      abs[0] += current.x;
      break;
    case "V":
      abs[0] += current.y;
      break;
    case "C":
      abs[0] += current.x;
      abs[1] += current.y;
      abs[2] += current.x;
      abs[3] += current.y;
      abs[4] += current.x;
      abs[5] += current.y;
      break;
    case "S":
    case "Q":
      abs[0] += current.x;
      abs[1] += current.y;
      abs[2] += current.x;
      abs[3] += current.y;
      break;
    case "A":
      abs[5] += current.x;
      abs[6] += current.y;
      break;
  }
  return abs;
}

function updateCurrent(type: string, values: number[], current: Point) {
  switch (type) {
    case "M":
    case "L":
    case "T":
      current.x = values[0];
      current.y = values[1];
      break;
    case "H":
      current.x = values[0];
      break;
    case "V":
      current.y = values[0];
      break;
    case "C":
      current.x = values[4];
      current.y = values[5];
      break;
    case "S":
    case "Q":
      current.x = values[2];
      current.y = values[3];
      break;
    case "A":
      current.x = values[5];
      current.y = values[6];
      break;
    case "Z":
      break;
  }
}

function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const x = mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x;
  const y = mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y;
  return { x, y };
}

function quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  const x = mt ** 2 * p0.x + 2 * mt * t * p1.x + t ** 2 * p2.x;
  const y = mt ** 2 * p0.y + 2 * mt * t * p1.y + t ** 2 * p2.y;
  return { x, y };
}

function approximateArc(
  start: Point,
  end: Point,
  rx: number,
  ry: number,
  angle: number,
  largeArc: number,
  sweep: number,
  segments: number
): Point[] {
  if (rx === 0 || ry === 0) {
    return [{ ...end }];
  }
  const rad = (Math.PI / 180) * angle;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const dx2 = (start.x - end.x) / 2;
  const dy2 = (start.y - end.y) / 2;

  const x1p = cosA * dx2 + sinA * dy2;
  const y1p = -sinA * dx2 + cosA * dy2;

  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  let radicant = (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq);
  radicant = Math.max(0, radicant);
  const coef = (largeArc !== sweep ? 1 : -1) * Math.sqrt(radicant);

  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);

  const cx = cosA * cxp - sinA * cyp + (start.x + end.x) / 2;
  const cy = sinA * cxp + cosA * cyp + (start.y + end.y) / 2;

  const startAngle = angleBetween(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaAngle = angleBetween(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );

  if (!sweep && deltaAngle > 0) {
    deltaAngle -= 2 * Math.PI;
  } else if (sweep && deltaAngle < 0) {
    deltaAngle += 2 * Math.PI;
  }

  const steps = Math.max(4, Math.ceil(Math.abs(deltaAngle) / (Math.PI / segments)));
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const angle = startAngle + (deltaAngle * i) / steps;
    const x = cx + rx * Math.cos(angle) * cosA - ry * Math.sin(angle) * sinA;
    const y = cy + rx * Math.cos(angle) * sinA + ry * Math.sin(angle) * cosA;
    points.push({ x, y });
  }
  return points;
}

function angleBetween(ux: number, uy: number, vx: number, vy: number) {
  const dot = ux * vx + uy * vy;
  const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
  if (len === 0) return 0;
  const ang = Math.acos(Math.min(Math.max(dot / len, -1), 1));
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  return sign * ang;
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M${x + r},${y}`,
    `H${x + width - r}`,
    `A${r},${r},0,0,1,${x + width},${y + r}`,
    `V${y + height - r}`,
    `A${r},${r},0,0,1,${x + width - r},${y + height}`,
    `H${x + r}`,
    `A${r},${r},0,0,1,${x},${y + height - r}`,
    `V${y + r}`,
    `A${r},${r},0,0,1,${x + r},${y}`,
    "Z",
  ].join(" ");
}

function approximateEllipse(cx: number, cy: number, rx: number, ry: number, quality: number): Point[] {
  const safeQuality = Math.max(quality, 2);
  const perimeter = rx === ry
    ? 2 * Math.PI * rx
    : Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const targetSegmentLength = Math.max(2, 24 / safeQuality);
  const rawSegments = perimeter > 0 ? Math.ceil(perimeter / targetSegmentLength) : 0;
  // Keep the count divisible by 4 so circles remain evenly distributed.
  const segments = Math.max(24, Math.ceil(rawSegments / 4) * 4);
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    points.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  }
  return points;
}

function mirrorControlPoint(control: Point | null, current: Point): Point {
  if (!control) return { ...current };
  return {
    x: 2 * current.x - control.x,
    y: 2 * current.y - control.y,
  };
}

export function computeHomography(source: Point[], target: Point[]): number[] {
  if (source.length !== 4 || target.length !== 4) {
    throw new Error("Homography requires four source and four target points.");
  }
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const s = source[i];
    const t = target[i];
    a.push([s.x, s.y, 1, 0, 0, 0, -t.x * s.x, -t.x * s.y]);
    b.push(t.x);
    a.push([0, 0, 0, s.x, s.y, 1, -t.y * s.x, -t.y * s.y]);
    b.push(t.y);
  }

  const h = gaussianSolve(a, b);
  return [...h, 1];
}

function gaussianSolve(a: number[][], b: number[]): number[] {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    a[i] = [...a[i], b[i]];
  }

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) maxRow = k;
    }
    [a[i], a[maxRow]] = [a[maxRow], a[i]];

    const pivot = a[i][i] || 1e-12;
    for (let j = i; j <= n; j++) a[i][j] /= pivot;

    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = a[k][i];
      for (let j = i; j <= n; j++) {
        a[k][j] -= factor * a[i][j];
      }
    }
  }

  return a.map((row) => row[n]);
}

export function applyHomography(point: Point, h: number[]): Point {
  const denom = h[6] * point.x + h[7] * point.y + h[8];
  return {
    x: (h[0] * point.x + h[1] * point.y + h[2]) / denom,
    y: (h[3] * point.x + h[4] * point.y + h[5]) / denom,
  };
}

export function warpShapes(shapes: ShapeDefinition[], homography: number[]): { id: string; d: string; attributes: Record<string, string> }[] {
  return shapes.map((shape) => {
    const pathParts: string[] = [];
    shape.polylines.forEach((line) => {
      if (!line.points.length) return;
      const transformed = line.points.map((point) => applyHomography(point, homography));
      const [first, ...rest] = transformed;
      const commands = [`M ${first.x} ${first.y}`];
      rest.forEach((pt) => {
        commands.push(`L ${pt.x} ${pt.y}`);
      });
      if (line.closed) commands.push("Z");
      pathParts.push(commands.join(" "));
    });
    return {
      id: shape.id,
      d: pathParts.join(" "),
      attributes: shape.attributes,
    };
  });
}

export function buildSvgMarkup(parsed: ParsedSvg, paths: { id: string; d: string; attributes: Record<string, string> }[]): string {
  const attrString = (attrs: Record<string, string>) =>
    Object.entries(attrs)
      .map(([key, value]) => `${key}="${value}"`)
      .join(" ");

  const content = paths
    .map((path) => `<path d="${path.d}" ${attrString(path.attributes)} />`)
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${parsed.viewBox.x} ${parsed.viewBox.y} ${parsed.viewBox.width} ${parsed.viewBox.height}">${content}</svg>`;
}
