import React, { useMemo } from 'react';
import { Tile, Character, Position } from '../types';

interface GameMapProps {
  map: Tile[][];
  characters: Character[];
  selectedCharacter: Character | null;
  validMoves: Position[];
  validAttacks: Position[];
  actionMode: 'move' | 'attack' | 'none';
  onTileClick: (x: number, y: number) => void;
}

// Isometric tile dimensions
const TILE_W = 64; // width of diamond
const TILE_H = 32; // height of diamond
const WALL_HEIGHT = 28; // visual height of walls/buildings
const MAP_COLS = 20;
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

// Create wall/building 3D shape (top face + left face + right face)
const wallPaths = (cx: number, cy: number, height: number) => {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  
  // Top face (same as diamond but raised)
  const top = `M ${cx} ${cy - hh - height} L ${cx + hw} ${cy - height} L ${cx} ${cy + hh - height} L ${cx - hw} ${cy - height} Z`;
  
  // Left face
  const left = `M ${cx - hw} ${cy - height} L ${cx} ${cy + hh - height} L ${cx} ${cy + hh} L ${cx - hw} ${cy} Z`;
  
  // Right face
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

const GameMap: React.FC<GameMapProps> = ({
  map,
  characters,
  selectedCharacter,
  validMoves,
  validAttacks,
  actionMode,
  onTileClick,
}) => {
  // Calculate SVG dimensions
  const svgWidth = useMemo(() => {
    // Max extent: from top-left to bottom-right in iso
    const corners = [
      toIso(0, 0),
      toIso(MAP_COLS - 1, 0),
      toIso(0, MAP_ROWS - 1),
      toIso(MAP_COLS - 1, MAP_ROWS - 1),
    ];
    const minX = Math.min(...corners.map(c => c.sx)) - TILE_W;
    const maxX = Math.max(...corners.map(c => c.sx)) + TILE_W;
    return maxX - minX;
  }, []);

  const svgHeight = useMemo(() => {
    const corners = [
      toIso(0, 0),
      toIso(MAP_COLS - 1, 0),
      toIso(0, MAP_ROWS - 1),
      toIso(MAP_COLS - 1, MAP_ROWS - 1),
    ];
    const minY = Math.min(...corners.map(c => c.sy)) - TILE_H - WALL_HEIGHT;
    const maxY = Math.max(...corners.map(c => c.sy)) + TILE_H;
    return maxY - minY;
  }, []);

  // Offset to ensure everything is visible
  const offsetX = TILE_W + 20;
  const offsetY = WALL_HEIGHT + TILE_H + 20;

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

  // Sort render order: back to front (y+x ascending)
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
    <div className="relative overflow-hidden rounded-lg border-2 border-gray-700 bg-gray-950 shadow-2xl"
      style={{ width: svgWidth + 40, height: svgHeight + 40 }}
    >
      <svg
        width={svgWidth + 40}
        height={svgHeight + 40}
        viewBox={`${-offsetX} ${-offsetY} ${svgWidth + 40} ${svgHeight + 40}`}
        className="cursor-pointer"
      >
        {/* Background */}
        <rect x={-offsetX} y={-offsetY} width={svgWidth + 40} height={svgHeight + 40} fill="#1a1a2e" />

        {/* Render tiles and characters in order */}
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
              {/* Base tile (ground) */}
              {isWall ? (
                <>
                  {/* Wall/Building 3D shape */}
                  {(() => {
                    const paths = wallPaths(cx, cy, WALL_HEIGHT);
                    return (
                      <>
                        {/* Left face */}
                        <path d={paths.left} fill={colors.left} stroke="#000" strokeWidth="0.5" />
                        {/* Right face */}
                        <path d={paths.right} fill={colors.right} stroke="#000" strokeWidth="0.5" />
                        {/* Top face */}
                        <path d={paths.top} fill={colors.top} stroke="#000" strokeWidth="0.5" />
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  {/* Flat tile */}
                  <path
                    d={diamondPath(cx, cy)}
                    fill={colors.top}
                    stroke="#00000030"
                    strokeWidth="0.5"
                  />
                  {/* Tile texture details */}
                  {tile.type === 'tree' && (
                    <>
                      {/* Tree trunk */}
                      <rect x={cx - 2} y={cy - 16} width={4} height={12} fill="#5c3d1e" rx="1" />
                      {/* Tree canopy */}
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
                    <>
                      <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} stroke="#ffffff15" strokeWidth="1" strokeDasharray="3,3" />
                    </>
                  )}
                </>
              )}

              {/* Cover indicator */}
              {tile.coverBonus > 0 && !isWall && !character && (
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#fbbf24"
                  opacity="0.7"
                >
                  {tile.coverBonus}
                </text>
              )}

              {/* Move highlight */}
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

              {/* Attack highlight */}
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

              {/* Selected highlight */}
              {selected && (
                <path
                  d={diamondPath(cx, cy)}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                />
              )}

              {/* Character */}
              {character && (
                <g>
                  {/* Shadow */}
                  <ellipse
                    cx={cx}
                    cy={cy + 2}
                    rx={8}
                    ry={4}
                    fill="black"
                    opacity="0.4"
                  />
                  {/* Body */}
                  <ellipse
                    cx={cx}
                    cy={cy - 14}
                    rx={9}
                    ry={12}
                    fill={character.color}
                    stroke={selected ? '#fbbf24' : '#00000060'}
                    strokeWidth={selected ? 2 : 1}
                  />
                  {/* Head */}
                  <circle
                    cx={cx}
                    cy={cy - 28}
                    r={7}
                    fill={character.color}
                    stroke={selected ? '#fbbf24' : '#00000060'}
                    strokeWidth={selected ? 2 : 1}
                  />
                  {/* Face emoji */}
                  <text
                    x={cx}
                    y={cy - 24}
                    textAnchor="middle"
                    fontSize="10"
                    dominantBaseline="middle"
                  >
                    {character.portrait}
                  </text>
                  {/* HP bar background */}
                  <rect
                    x={cx - 12}
                    y={cy - 40}
                    width={24}
                    height={4}
                    rx={2}
                    fill="#000"
                    opacity="0.7"
                  />
                  {/* HP bar fill */}
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
                  {/* Name tag */}
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
                  {/* Enemy indicator */}
                  {character.isEnemy && (
                    <text
                      x={cx + 10}
                      y={cy - 30}
                      fontSize="8"
                      fill="#ef4444"
                    >
                      ⚠
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* Grid coordinate hints at edges */}
        {Array.from({ length: MAP_COLS }, (_, x) => {
          const { sx, sy } = toIso(x, -1);
          return (
            <text
              key={`col-${x}`}
              x={sx + offsetX}
              y={sy + offsetY + 10}
              textAnchor="middle"
              fontSize="7"
              fill="#ffffff30"
            >
              {x}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default GameMap;
