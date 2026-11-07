import { FLOOR_IDS, type FloorId } from "@/lib/types";

export type Vec = { x: number; y: number };

export const COS30 = Math.cos(Math.PI / 6);
export const SIN30 = Math.sin(Math.PI / 6);

export const VIEW = { width: 780, height: 980 };

export const ORIGIN: Vec = { x: 404, y: 768 };

export const BUILDING = {
  w: 236,
  d: 162,
  wall: 60,
  slab: 12,
  gap: 52,
  baseZ: 30,
} as const;

export type FloorGeom = {
  id: FloorId;
  index: number;
  w: number;
  d: number;
  wall: number;
  slab: number;
  zFloor: number;
};

export function project(x: number, y: number, z: number, origin: Vec = ORIGIN): Vec {
  return {
    x: origin.x + (x - y) * COS30,
    y: origin.y + (x + y) * SIN30 - z,
  };
}

export function polygon(points: Vec[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

export function floorGeoms(): FloorGeom[] {
  const { w, d, wall, slab, gap, baseZ } = BUILDING;
  const step = wall + slab + gap;
  return FLOOR_IDS.map((id, index) => ({
    id,
    index,
    w,
    d,
    wall,
    slab,
    zFloor: baseZ + index * step,
  }));
}

export function floorGeom(id: FloorId): FloorGeom {
  const geom = floorGeoms().find((item) => item.id === id);
  if (!geom) throw new Error(`未知楼层：${id}`);
  return geom;
}

export function floorCenter(geom: FloorGeom): Vec {
  const corners = [
    project(0, 0, geom.zFloor),
    project(geom.w, 0, geom.zFloor),
    project(geom.w, geom.d, geom.zFloor),
    project(0, geom.d, geom.zFloor),
  ];
  return {
    x: corners.reduce((sum, point) => sum + point.x, 0) / corners.length,
    y: corners.reduce((sum, point) => sum + point.y, 0) / corners.length,
  };
}

export function floorMotion(
  index: number,
  focusedIndex: number | null,
  center: Vec,
): string {
  if (focusedIndex === null) return "";
  const scale = index === focusedIndex ? 1.055 : 1;
  let tx = 0;
  let ty = 0;
  if (index === focusedIndex) {
    tx = 14;
    ty = 6;
  } else if (index > focusedIndex) {
    ty = -30 * (index - focusedIndex);
  } else {
    ty = 12;
  }
  return `translate(${tx} ${ty}) translate(${center.x.toFixed(2)} ${center.y.toFixed(2)}) scale(${scale}) translate(${(-center.x).toFixed(2)} ${(-center.y).toFixed(2)})`;
}

export function layoutPoints(): Vec[] {
  const points: Vec[] = [];
  for (const geom of floorGeoms()) {
    const samples: Array<[number, number, number]> = [
      [0, 0, geom.zFloor],
      [geom.w, 0, geom.zFloor],
      [0, geom.d, geom.zFloor],
      [geom.w, geom.d, geom.zFloor],
      [0, 0, geom.zFloor + geom.wall],
      [geom.w, geom.d, geom.zFloor - geom.slab],
    ];
    for (const [x, y, z] of samples) points.push(project(x, y, z));
    points.push(floorCenter(geom));
  }
  const top = floorGeoms()[floorGeoms().length - 1];
  points.push(project(top.w / 2, top.d / 2, top.zFloor + top.wall + 46));
  return points;
}
