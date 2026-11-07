"use client";

import { FLOORS, seatsOn } from "@/lib/catalog";
import {
  VIEW,
  floorCenter,
  floorGeoms,
  floorMotion,
  polygon,
  project,
  type FloorGeom,
} from "@/lib/geometry";
import { botById } from "@/lib/roster";
import type { FloorId } from "@/lib/types";

const THEME: Record<
  FloorId,
  { wallL: string; wallR: string; deck: string; lipL: string; lipR: string; beam: string }
> = {
  admission: {
    wallL: "#6f9f98",
    wallR: "#d7f3ea",
    deck: "#e7f7f1",
    lipL: "#1b4a50",
    lipR: "#12383d",
    beam: "#21585d",
  },
  strategy: {
    wallL: "#d7a85a",
    wallR: "#f8e7c8",
    deck: "#f6e2bc",
    lipL: "#8a571f",
    lipR: "#6b4216",
    beam: "#a56b28",
  },
  reconciliation: {
    wallL: "#c49a58",
    wallR: "#f6ead2",
    deck: "#f3e2c2",
    lipL: "#6d4a24",
    lipR: "#523618",
    beam: "#8a6233",
  },
  analysis: {
    wallL: "#7d97b4",
    wallR: "#e7f0f7",
    deck: "#d9e6f2",
    lipL: "#243e5c",
    lipR: "#1a314a",
    beam: "#35557a",
  },
  feedback: {
    wallL: "#e09a84",
    wallR: "#fbe4da",
    deck: "#f7d4c6",
    lipL: "#8c3e32",
    lipR: "#6e2d26",
    beam: "#a85a49",
  },
};

type TowerProps = {
  floorId: FloorId | null;
  seatId: string | null;
  onFloor: (id: FloorId) => void;
  onSeat: (id: string) => void;
};

export function Tower({ floorId, seatId, onFloor, onSeat }: TowerProps) {
  const geoms = floorGeoms();
  const focusedIndex = floorId ? FLOORS[floorId].index : null;

  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      role="img"
      aria-label="五层实验塔。点击楼层聚焦，点击席位查看角色。"
      className="h-auto w-full"
      data-testid="station-tower"
    >
      <Sky />
      {geoms.map((geom) => (
        <FloorLayer
          key={geom.id}
          geom={geom}
          focusedIndex={focusedIndex}
          selected={floorId === geom.id}
          seatId={seatId}
          onFloor={onFloor}
          onSeat={onSeat}
        />
      ))}
    </svg>
  );
}

function Sky() {
  return (
    <g>
      <rect width={VIEW.width} height={VIEW.height} fill="#14343c" />
      <circle cx="628" cy="118" r="46" fill="#f6e2bc" opacity="0.18" />
      <circle cx="628" cy="118" r="28" fill="#f3d7a4" />
      <path d="M80 250 C160 220 210 250 280 230 C340 214 390 240 470 226" fill="none" stroke="#2c5960" strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="150" cy="300" rx="70" ry="16" fill="#1d464c" />
      <ellipse cx="250" cy="318" rx="46" ry="10" fill="#24555b" />
      <ellipse cx="390" cy="860" rx="280" ry="48" fill="#0f2c33" />
      <ellipse cx="390" cy="852" rx="230" ry="28" fill="#1a4650" opacity="0.85" />
      <Buoy />
    </g>
  );
}

function Buoy() {
  const post = box(-46, 214, 0, 14, 14, 70, {
    top: "#f0d7a6",
    sideA: "#c9842f",
    sideB: "#e7b56a",
  });
  return (
    <g aria-hidden="true">
      {post}
      <circle cx={project(-39, 221, 78).x} cy={project(-39, 221, 78).y} r="7" fill="#e39b3a" />
    </g>
  );
}

function FloorLayer({
  geom,
  focusedIndex,
  selected,
  seatId,
  onFloor,
  onSeat,
}: {
  geom: FloorGeom;
  focusedIndex: number | null;
  selected: boolean;
  seatId: string | null;
  onFloor: (id: FloorId) => void;
  onSeat: (id: string) => void;
}) {
  const meta = FLOORS[geom.id];
  const theme = THEME[geom.id];
  const center = floorCenter(geom);
  const motion = floorMotion(geom.index, focusedIndex, center);
  const dim = focusedIndex !== null && !selected;
  const { w, d, wall, slab, zFloor } = geom;
  const zTop = zFloor + wall;
  const faces = {
    backX: [
      project(0, 0, zFloor),
      project(0, d, zFloor),
      project(0, d, zTop),
      project(0, 0, zTop),
    ],
    backY: [
      project(0, 0, zFloor),
      project(w, 0, zFloor),
      project(w, 0, zTop),
      project(0, 0, zTop),
    ],
    deck: [
      project(0, 0, zFloor),
      project(w, 0, zFloor),
      project(w, d, zFloor),
      project(0, d, zFloor),
    ],
    lipA: [
      project(w, 0, zFloor - slab),
      project(w, d, zFloor - slab),
      project(w, d, zFloor),
      project(w, 0, zFloor),
    ],
    lipB: [
      project(0, d, zFloor - slab),
      project(w, d, zFloor - slab),
      project(w, d, zFloor),
      project(0, d, zFloor),
    ],
  };
  const plaque = project(w * 0.62, d, zFloor - 3);

  function onKey(event: React.KeyboardEvent, action: () => void) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  }

  return (
    <g transform={motion} opacity={dim ? 0.4 : 1} data-floor={geom.id}>
      <g
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`${meta.number} ${meta.name}`}
        data-testid={`tower-floor-${geom.id}`}
        className="floor-button"
        onClick={() => onFloor(geom.id)}
        onKeyDown={(event) => onKey(event, () => onFloor(geom.id))}
        style={{ cursor: "pointer" }}
      >
        <polygon points={polygon(faces.backX)} fill={theme.wallL} />
        <polygon points={polygon(faces.backY)} fill={theme.wallR} />
        <Windows geom={geom} />
        <polygon points={polygon(faces.deck)} fill={theme.deck} className="deck-stroke" />
        {selected ? (
          <polygon
            points={polygon(faces.deck)}
            fill="none"
            stroke="#f0d7a6"
            strokeWidth="3"
          />
        ) : null}
        <polygon points={polygon(faces.lipA)} fill={theme.lipR} />
        <polygon points={polygon(faces.lipB)} fill={theme.lipL} />
        <polygon
          points={polygon([
            project(0, 0, zTop),
            project(w, 0, zTop),
            project(w, 16, zTop),
            project(0, 16, zTop),
          ])}
          fill={theme.beam}
        />
        <polygon
          points={polygon([
            project(0, 0, zTop),
            project(0, d, zTop),
            project(16, d, zTop),
            project(16, 0, zTop),
          ])}
          fill={theme.beam}
          opacity="0.85"
        />
        {geom.id === "feedback" ? <Roof geom={geom} /> : null}
        <Props floorId={geom.id} z={zFloor} />
        <text
          x={plaque.x}
          y={plaque.y}
          textAnchor="middle"
          fill="#f6f1e6"
          fontSize="15"
          fontWeight="700"
        >
          {meta.number}
        </text>
      </g>
      {seatsOn(geom.id).map((seat) => {
        const bot = botById(seat.botId);
        const anchor = project(w * seat.u, d * seat.v, zFloor + 22);
        const active = seatId === seat.id;
        return (
          <g
            key={seat.id}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            aria-label={`${seat.seat} ${bot?.name ?? ""}`}
            data-testid={`tower-seat-${seat.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onSeat(seat.id);
            }}
            onKeyDown={(event) =>
              onKey(event, () => {
                onSeat(seat.id);
              })
            }
            style={{ cursor: "pointer" }}
          >
            <Desk x={w * seat.u} y={d * seat.v} z={zFloor} tone={deskTone(geom.id)} />
            {geom.id === "reconciliation" || seat.id === "analysis-abacus" ? (
              <Beads x={w * seat.u} y={d * seat.v} z={zFloor + 16} />
            ) : null}
            <circle
              cx={anchor.x}
              cy={anchor.y}
              r="24"
              fill={active ? "rgba(227,155,58,0.28)" : "transparent"}
              stroke={active ? "#e39b3a" : "transparent"}
              strokeWidth="2"
            />
            {selected ? (
              <text
                x={anchor.x}
                y={anchor.y - 30}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill="#1c2a30"
                stroke="#f7f3ea"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {bot?.name}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function deskTone(id: FloorId): "wood" | "brass" | "ink" | "paper" {
  if (id === "reconciliation" || id === "analysis") return "brass";
  if (id === "strategy") return "wood";
  if (id === "feedback") return "paper";
  return "ink";
}

function Desk({
  x,
  y,
  z,
  tone,
}: {
  x: number;
  y: number;
  z: number;
  tone: "wood" | "brass" | "ink" | "paper";
}) {
  const palette = {
    wood: { top: "#e8c48a", sideA: "#b88848", sideB: "#f4ddb4" },
    brass: { top: "#ead7aa", sideA: "#a9783b", sideB: "#f7edd4" },
    ink: { top: "#d5e3f0", sideA: "#6d8eae", sideB: "#eef5fa" },
    paper: { top: "#f4c7b6", sideA: "#c46b56", sideB: "#f8ddd2" },
  }[tone];
  const dw = 58;
  const dd = 32;
  return (
    <g>
      {box(x - dw / 2, y - dd / 2, z, dw, dd, 16, palette)}
      {box(x - 8, y + dd / 2 - 2, z, 18, 14, 10, {
        top: "#d36a4e",
        sideA: "#8d3d32",
        sideB: "#f0b39a",
      })}
    </g>
  );
}

function Beads({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <g>
      {Array.from({ length: 5 }, (_, index) => (
        <g key={index}>
          {box(x - 20 + index * 8, y - 6, z, 6, 6, 6, {
            top: index % 2 === 0 ? "#8c3a3a" : "#1d4e55",
            sideA: "#5c2a24",
            sideB: "#e7b6a4",
          })}
        </g>
      ))}
    </g>
  );
}

function Props({ floorId, z }: { floorId: FloorId; z: number }) {
  if (floorId === "admission") {
    return box(46, 28, z, 36, 8, 28, {
      top: "#163e44",
      sideA: "#0f2c33",
      sideB: "#2f6d74",
    });
  }
  if (floorId === "feedback") {
    return (
      <g>
        {box(168, 28, z, 22, 16, 8, {
          top: "#f7f3ea",
          sideA: "#d7c3a4",
          sideB: "#fffaf2",
        })}
        {box(170, 30, z + 8, 18, 12, 6, {
          top: "#f3e2c4",
          sideA: "#c9a36a",
          sideB: "#fff6e6",
        })}
      </g>
    );
  }
  if (floorId === "analysis") {
    return box(150, 24, z, 18, 14, 6, {
      top: "#8c3a3a",
      sideA: "#5c2420",
      sideB: "#d98a7c",
    });
  }
  return box(24, 24, z, 12, 12, 10, {
    top: "#2f7c78",
    sideA: "#1d4e55",
    sideB: "#8fccc0",
  });
}

function Windows({ geom }: { geom: FloorGeom }) {
  const z = geom.zFloor + 22;
  const h = 18;
  const spots: Array<[number, number]> = [
    [48, 1.2],
    [108, 1.2],
    [168, 1.2],
  ];
  return (
    <g>
      {spots.map(([x, y]) => (
        <polygon
          key={`${x}-${y}`}
          points={polygon([
            project(x, y, z),
            project(x + 20, y, z),
            project(x + 20, y, z + h),
            project(x, y, z + h),
          ])}
          fill="#f6c56d"
          opacity="0.92"
        />
      ))}
    </g>
  );
}

function Roof({ geom }: { geom: FloorGeom }) {
  const z = geom.zFloor + geom.wall + 8;
  const peak = project(geom.w / 2, geom.d / 2, z + 42);
  const eaves = [
    project(-12, -12, z),
    project(geom.w + 12, -12, z),
    project(geom.w + 12, geom.d + 12, z),
    project(-12, geom.d + 12, z),
  ];
  const shade = ["#1b3e44", "#24555c", "#316870", "#1a3338"];
  return (
    <g>
      {eaves.map((point, index) => (
        <polygon
          key={shade[index]}
          points={polygon([point, eaves[(index + 1) % 4], peak])}
          fill={shade[index]}
        />
      ))}
    </g>
  );
}

function box(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  fill: { top: string; sideA: string; sideB: string },
) {
  const x1 = x + w;
  const y1 = y + d;
  const z1 = z + h;
  return (
    <g>
      <polygon
        points={polygon([
          project(x1, y, z),
          project(x1, y1, z),
          project(x1, y1, z1),
          project(x1, y, z1),
        ])}
        fill={fill.sideA}
      />
      <polygon
        points={polygon([
          project(x, y1, z),
          project(x1, y1, z),
          project(x1, y1, z1),
          project(x, y1, z1),
        ])}
        fill={fill.sideB}
      />
      <polygon
        points={polygon([
          project(x, y, z1),
          project(x1, y, z1),
          project(x1, y1, z1),
          project(x, y1, z1),
        ])}
        fill={fill.top}
      />
    </g>
  );
}
