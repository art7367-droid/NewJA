import React, { useMemo, useState, useEffect } from 'react';
import { Tile, Character, Position, Projectile } from '../types';

interface GameMapProps {
  map: Tile[][];
  characters: Character[];
  selectedCharacter: Character | null;
  validMoves: Position[];
  validAttacks: Position[];
  actionMode: 'move' | 'attack' | 'none';
  onTileClick: (x: number, y: number) => void;
  projectiles: Projectile[];
}

// Isometric tile dimensions
const TILE_W = 64;
const TILE_H = 32;
const WALL_HEIGHT = 28;
const MAP_COLS = 15;
const MAP_ROWS = 15;

// Convert grid coords to isometric screen coords (top-center of tile)
const toIso = (x: number, y: number): { sx: number; sy: number } => {
  const sx = (x - y) * (TILE_W / 2);
  const sy = (x + y) * (TILE_H / 2);
  return { sx, sy };
};

// Create diamond path for a tile
const diamondPath = (cx: number, cy: number): string => {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  return `M ${cx} ${cy - hh} L ${cx + hw} ${cy} L ${cx} ${cy + hh} L ${cx - hw} ${cy} Z`;
};

// Create wall/building 3D shape
const wallPaths = (cx: number, cy: number, height: number) => {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const top = `M ${cx} ${cy - hh - height} L ${cx + hw} ${cy - height} L ${cx} ${cy + hh - height} L ${cx - hw} ${cy - height} Z`;
  const left = `M ${cx - hw} ${cy - height} L ${cx} ${cy + hh - height} L ${cx} ${cy + hh} L ${cx - hw} ${cy} Z`;
  const right = `M ${cx + hw} ${cy - height} L ${cx} ${cy + hh - height} L ${cx} ${cy + hh} L ${cx + hw} ${cy} Z`;
  return { top, left, right };
};

const getTileColors = (tile: Tile): { top: string; left: string; right: string } => {
  switch (tile.type) {
    case 'grass': return { top: '#5a8f4a', left: '#4a7c3f', right: '#3d6b34' };
    case 'dirt': return { top: '#9b8567', left: '#8b7355', right: '#7a6348' };
    case 'road': return { top: '#a8a8a8', left: '#909090', right: '#787878' };
    case 'wall': return { top: '#7a7a7a', left: '#5c5c5c', right: '#4a4a4a' };
    case 'tree': return { top: '#3d7a34', left: '#2d5a27', right: '#1f4a1a' };
    case 'building': return { top: '#8b7b6f', left: '#6b5b4f', right: '#5a4a3f' };
    case 'water': return { top: '#3b82f6', left: '#2563eb', right: '#1d4ed8' };
    default: return { top: '#5a8f4a', left: '#4a7c3f', right: '#3d6b34' };
  }
};

// Animated projectile component
const ProjectileAnim: React.FC<{ projectile: Projectile; offsetX: number; offsetY: number }> = ({ projectile, offsetX, offsetY }) => {
  const [progress, setProgress] = useState(0);
  const [showImpact, setShowImpact] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const flightDuration = projectile.duration * 0.6;
    const impactDuration = projectile.duration * 0.4;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < flightDuration) {
        setProgress(elapsed / flightDuration);
        requestAnimationFrame(animate);
      } else if (elapsed < projectile.duration) {
        setProgress(1);
        setShowImpact(true);
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [projectile.duration]);

  const fromIso = toIso(projectile.from.x, projectile.from.y);
  const toIsoPos = toIso(projectile.to.x, projectile.to.y);

  const fromX = fromIso.sx + offsetX;
  const fromY = fromIso.sy + offsetY - 20; // Start from character height
  const toX = toIsoPos.sx + offsetX;
  const toY = toIsoPos.sy + offsetY - 20;

  // Current position with arc
  const currentX = fromX + (toX - fromX) * progress;
  const arcHeight = -40; // Arc up
  const currentY = fromY + (toY - fromY) * progress + arcHeight * Math.sin(progress * Math.PI);

  if (progress >= 1 && !showImpact) return null;

  return (
    <g>
      {/* Trail */}
      {!showImpact && (
        <>
          <line
            x1={fromX}
            y1={fromY}
            x2={currentX}
            y2={currentY}
            stroke="#fbbf24"
            strokeWidth="1.5"
            opacity="0.6"
            strokeDasharray="4,2"
          />
          {/* Bullet/projectile */}
          <circle
            cx={currentX}
            cy={currentY}
            r="3"
            fill="#fbbf24"
            className="animate-pulse"
          >
            <animate
              attributeName="r"
              values="3;4;3"
              dur="0.2s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Muzzle flash at origin */}
          {progress < 0.3 && (
            <circle
              cx={fromX}
              cy={fromY}
              r={8 * (1 - progress / 0.3)}
              fill="#fbbf24"
              opacity={0.8 * (1 - progress / 0.3)}
            />
          )}
        </>
      )}

      {/* Impact effect */}
      {showImpact && (
        <g>
          {projectile.hit ? (
            <>
              {/* Hit flash */}
              <circle
                cx={toX}
                cy={toY}
                r="12"
                fill={projectile.critical ? '#ef4444' : '#fbbf24'}
                opacity="0.8"
              >
                <animate
                  attributeName="r"
                  values="4;16;8"
                  dur="0.4s"
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.6;0"
                  dur="0.4s"
                  fill="freeze"
                />
              </circle>
              {/* Sparks */}
              {projectile.critical && (
                <>
                  {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const sparkDist = 20;
                    return (
                      <line
                        key={i}
                        x1={toX}
                        y1={toY}
                        x2={toX + Math.cos(rad) * sparkDist}
                        y2={toY + Math.sin(rad) * sparkDist}
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.8"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.9;0"
                          dur="0.3s"
                          fill="freeze"
                        />
                      </line>
                    );
                  })}
                </>
              )}
              {/* Hit marker */}
              <text
                x={toX}
                y={toY - 20}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill={projectile.critical ? '#ef4444' : '#fbbf24'}
              >
                {projectile.critical ? '💥 КРИТ!' : `-${projectile.damage}`}
                <animate
                  attributeName="y"
                  values={`${toY - 20};${toY - 40}`}
                  dur="0.6s"
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  values="1;0"
                  dur="0.8s"
                  fill="freeze"
                />
              </text>
              {/* Kill indicator */}
              {projectile.killed && (
                <text
                  x={toX}
                  y={toY - 45}
                  textAnchor="middle"
                  fontSize="16"
                  fill="#ef4444"
                  fontWeight="bold"
                >
                  ☠️ УБИТ!
                  <animate
                    attributeName="opacity"
                    values="1;0"
                    dur="1s"
                    fill="freeze"
                  />
                </text>
              )}
            </>
          ) : (
            <>
              {/* Miss effect */}
              <circle
                cx={toX}
                cy={toY}
                r="6"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                opacity="0.6"
              >
                <animate
                  attributeName="r"
                  values="2;10"
                  dur="0.3s"
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  values="0.8;0"
                  dur="0.3s"
                  fill="freeze"
                />
              </circle>
              <text
                x={toX}
                y={toY - 15}
                textAnchor="middle"
                fontSize="10"
                fill="#9ca3af"
                fontStyle="italic"
              >
                промах
                <animate
                  attributeName="opacity"
                  values="1;0"
                  dur="0.6s"
                  fill="freeze"
                />
              </text>
            </>
          )}
        </g>
      )}
    </g>
  );
};

const GameMap: React.FC<GameMapProps> = ({
  map,
  characters,
  selectedCharacter,
  validMoves,
  validAttacks,
  actionMode,
  onTileClick,
  projectiles,
}) => {
  const { svgWidth, svgHeight, offsetX, offsetY } = useMemo(() => {
    const topLeft = toIso(0, 0);
    const topRight = toIso(MAP_COLS - 1, 0);
    const bottomLeft = toIso(0, MAP_ROWS - 1);
    const bottomRight = toIso(MAP_COLS - 1, MAP_ROWS - 1);

    const minX = Math.min(topLeft.sx, topRight.sx, bottomLeft.sx, bottomRight.sx) - TILE_W / 2;
    const maxX = Math.max(topLeft.sx, topRight.sx, bottomLeft.sx, bottomRight.sx) + TILE_W / 2;
    const minY = Math.min(topLeft.sy, topRight.sy, bottomLeft.sy, bottomRight.sy) - TILE_H / 2 - WALL_HEIGHT - 50;
    const maxY = Math.max(topLeft.sy, topRight.sy, bottomLeft.sy, bottomRight.sy) + TILE_H / 2;

    const width = maxX - minX + 40;
    const height = maxY - minY + 40;
    const offX = -minX + 20;
    const offY = -minY + 20;

    return { svgWidth: width, svgHeight: height, offsetX: offX, offsetY: offY };
  }, []);

  const getCharacterAt = (x: number, y: number): Character | undefined => {
    return characters.find(c => c.isAlive && c.position.x === x && c.position.y === y);
  };

  const isValidMove = (x: number, y: number): boolean => {
    return validMoves.some(p => p.x === x && p.y === y);
  };

  const isValidAttack = (x: number, y: number): boolean => {
    return validAttacks.some(p => p.x === x && p.y === y);
  };

  const isSelected = (x: number, y: number): boolean => {
    return selectedCharacter?.position.x === x && selectedCharacter?.position.y === y;
  };

  const renderOrder = useMemo(() => {
    const items: { x: number; y: number; order: number }[] = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        items.push({ x, y, order: x + y });
      }
    }
    items.sort((a, b) => a.order - b.order || a.y - b.y);
    return items;
  }, []);

  const handleClick = (x: number, y: number) => {
    onTileClick(x, y);
  };

  return (
    <div
      className="relative rounded-lg border-2 border-gray-700 bg-gray-950 shadow-2xl"
      style={{ width: svgWidth, height: svgHeight, minWidth: svgWidth, minHeight: svgHeight }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="cursor-pointer block"
      >
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#1a1a2e" />

        {renderOrder.map(({ x, y }) => {
          const tile = map[y][x];
          const { sx, sy } = toIso(x, y);
          const cx = sx + offsetX;
          const cy = sy + offsetY;
          const colors = getTileColors(tile);
          const isWall = tile.type === 'wall' || tile.type === 'building';
          const character = getCharacterAt(x, y);
          const isMove = isValidMove(x, y);
          const isAttack = isValidAttack(x, y);
          const selected = isSelected(x, y);

          return (
            <g key={`tile-${x}-${y}`} onClick={() => handleClick(x, y)} className="cursor-pointer">
              {isWall ? (
                <>
                  {(() => {
                    const paths = wallPaths(cx, cy, WALL_HEIGHT);
                    return (
                      <>
                        <path d={paths.left} fill={colors.left} stroke="#000" strokeWidth="0.5" />
                        <path d={paths.right} fill={colors.right} stroke="#000" strokeWidth="0.5" />
                        <path d={paths.top} fill={colors.top} stroke="#000" strokeWidth="0.5" />
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <path
                    d={diamondPath(cx, cy)}
                    fill={colors.top}
                    stroke="#00000030"
                    strokeWidth="0.5"
                  />
                  {tile.type === 'tree' && (
                    <>
                      <rect x={cx - 2} y={cy - 16} width={4} height={12} fill="#5c3d1e" rx="1" />
                      <ellipse cx={cx} cy={cy - 20} rx={10} ry={12} fill="#2d7a22" />
                      <ellipse cx={cx - 4} cy={cy - 18} rx={7} ry={9} fill="#3d8f34" />
                      <ellipse cx={cx + 4} cy={cy - 22} rx={6} ry={8} fill="#4aa340" />
                    </>
                  )}
                  {tile.type === 'water' && (
                    <>
                      <path d={diamondPath(cx, cy)} fill="#4090ff" opacity="0.3" />
                      <line x1={cx - 10} y1={cy - 2} x2={cx + 10} y2={cy - 2} stroke="#90c0ff" strokeWidth="0.5" opacity="0.5" />
                      <line x1={cx - 8} y1={cy + 3} x2={cx + 8} y2={cy + 3} stroke="#90c0ff" strokeWidth="0.5" opacity="0.4" />
                    </>
                  )}
                  {tile.type === 'road' && (
                    <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} stroke="#ffffff15" strokeWidth="1" strokeDasharray="3,3" />
                  )}
                </>
              )}

              {tile.coverBonus > 0 && !isWall && !character && (
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fill="#fbbf24" opacity="0.7">
                  {tile.coverBonus}
                </text>
              )}

              {isMove && !character && !isWall && (
                <path
                  d={diamondPath(cx, cy)}
                  fill="#3b82f6"
                  opacity="0.35"
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              )}

              {isAttack && !isWall && (
                <path
                  d={diamondPath(cx, cy)}
                  fill="#ef4444"
                  opacity="0.3"
                  stroke="#f87171"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              )}

              {selected && (
                <path d={diamondPath(cx, cy)} fill="none" stroke="#fbbf24" strokeWidth="2.5" />
              )}

              {character && (
                <g>
                  <ellipse cx={cx} cy={cy + 2} rx={8} ry={4} fill="black" opacity="0.4" />
                  <ellipse
                    cx={cx}
                    cy={cy - 14}
                    rx={9}
                    ry={12}
                    fill={character.color}
                    stroke={selected ? '#fbbf24' : '#00000060'}
                    strokeWidth={selected ? 2 : 1}
                  />
                  <circle
                    cx={cx}
                    cy={cy - 28}
                    r={7}
                    fill={character.color}
                    stroke={selected ? '#fbbf24' : '#00000060'}
                    strokeWidth={selected ? 2 : 1}
                  />
                  <text x={cx} y={cy - 24} textAnchor="middle" fontSize="10" dominantBaseline="middle">
                    {character.portrait}
                  </text>
                  <rect x={cx - 12} y={cy - 40} width={24} height={4} rx={2} fill="#000" opacity="0.7" />
                  <rect
                    x={cx - 12}
                    y={cy - 40}
                    width={24 * (character.hp / character.maxHp)}
                    height={4}
                    rx={2}
                    fill={
                      character.hp / character.maxHp > 0.5
                        ? '#22c55e'
                        : character.hp / character.maxHp > 0.25
                        ? '#f59e0b'
                        : '#ef4444'
                    }
                  />
                  <text
                    x={cx}
                    y={cy - 44}
                    textAnchor="middle"
                    fontSize="7"
                    fill={character.isEnemy ? '#fca5a5' : '#bbf7d0'}
                    fontWeight="bold"
                  >
                    {character.name}
                  </text>
                  {character.isEnemy && (
                    <text x={cx + 10} y={cy - 30} fontSize="8" fill="#ef4444">
                      ⚠
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* Projectiles */}
        {projectiles.map(proj => (
          <ProjectileAnim key={proj.id} projectile={proj} offsetX={offsetX} offsetY={offsetY} />
        ))}
      </svg>
    </div>
  );
};

export default GameMap;
