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

const TILE_W = 64;
const TILE_H = 32;
const WALL_HEIGHT = 28;
const MAP_COLS = 15;
const MAP_ROWS = 15;

const toIso = (x: number, y: number): { sx: number; sy: number } => {
  const sx = (x - y) * (TILE_W / 2);
  const sy = (x + y) * (TILE_H / 2);
  return { sx, sy };
};

const diamondPath = (cx: number, cy: number): string => {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  return `M ${cx} ${cy - hh} L ${cx + hw} ${cy} L ${cx} ${cy + hh} L ${cx - hw} ${cy} Z`;
};

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

// Enhanced character rendering with detailed SVG
const CharacterSprite: React.FC<{ character: Character; cx: number; cy: number; selected: boolean }> = ({ character, cx, cy, selected }) => {
  const isEnemy = character.isEnemy;
  const bodyColor = character.color;
  const skinColor = isEnemy ? '#d4a574' : '#f4c8a0';
  
  return (
    <g>
      {/* Shadow */}
      <ellipse cx={cx} cy={cy + 2} rx={10} ry={5} fill="black" opacity="0.5" />
      
      {/* Legs */}
      <ellipse cx={cx - 3} cy={cy - 5} rx={3} ry={6} fill={isEnemy ? '#2d2d2d' : '#3d5a3d'} />
      <ellipse cx={cx + 3} cy={cy - 5} rx={3} ry={6} fill={isEnemy ? '#2d2d2d' : '#3d5a3d'} />
      
      {/* Body/Torso */}
      <ellipse cx={cx} cy={cy - 15} rx={8} ry={10} fill={bodyColor} />
      
      {/* Vest/Armor details */}
      <rect x={cx - 6} y={cy - 20} width={12} height={8} rx={2} fill={isEnemy ? '#1a1a1a' : '#2d4a2d'} opacity="0.7" />
      
      {/* Arms */}
      <ellipse cx={cx - 8} cy={cy - 14} rx={3} ry={7} fill={bodyColor} transform={`rotate(-20 ${cx - 8} ${cy - 14})`} />
      <ellipse cx={cx + 8} cy={cy - 14} rx={3} ry={7} fill={bodyColor} transform={`rotate(20 ${cx + 8} ${cy - 14})`} />
      
      {/* Hands */}
      <circle cx={cx - 9} cy={cy - 8} r={2.5} fill={skinColor} />
      <circle cx={cx + 9} cy={cy - 8} r={2.5} fill={skinColor} />
      
      {/* Head */}
      <circle cx={cx} cy={cy - 28} r={6} fill={skinColor} />
      
      {/* Helmet/Hat */}
      {isEnemy ? (
        <ellipse cx={cx} cy={cy - 32} rx={7} ry={4} fill="#4a4a4a" />
      ) : (
        <ellipse cx={cx} cy={cy - 32} rx={7} ry={4} fill={character.color === '#22c55e' ? '#2d5a2d' : character.color === '#3b82f6' ? '#1e3a5a' : '#4a3a2a'} />
      )}
      
      {/* Face details */}
      <circle cx={cx - 2} cy={cy - 28} r={0.8} fill="#000" />
      <circle cx={cx + 2} cy={cy - 28} r={0.8} fill="#000" />
      
      {/* Weapon */}
      <rect x={cx + 6} y={cy - 18} width={12} height={2} rx={1} fill="#3d3d3d" transform={`rotate(-30 ${cx + 6} ${cy - 18})`} />
      <rect x={cx + 10} y={cy - 20} width={3} height={4} rx={1} fill="#2d2d2d" transform={`rotate(-30 ${cx + 10} ${cy - 20})`} />
      
      {/* Selection ring */}
      {selected && (
        <ellipse cx={cx} cy={cy} rx={12} ry={6} fill="none" stroke="#fbbf24" strokeWidth={2.5} opacity={0.8}>
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
      )}
      
      {/* Enemy indicator */}
      {isEnemy && (
        <circle cx={cx + 10} cy={cy - 30} r={3} fill="#ef4444" opacity={0.8}>
          <animate attributeName="r" values="3;4;3" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
      
      {/* HP bar */}
      <rect x={cx - 12} y={cy - 42} width={24} height={3} rx={1.5} fill="#000" opacity="0.8" />
      <rect
        x={cx - 12}
        y={cy - 42}
        width={24 * (character.hp / character.maxHp)}
        height={3}
        rx={1.5}
        fill={
          character.hp / character.maxHp > 0.5
            ? '#22c55e'
            : character.hp / character.maxHp > 0.25
            ? '#f59e0b'
            : '#ef4444'
        }
      >
        <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
      </rect>
      
      {/* Name tag */}
      <text
        x={cx}
        y={cy - 46}
        textAnchor="middle"
        fontSize="7"
        fill={isEnemy ? '#fca5a5' : '#bbf7d0'}
        fontWeight="bold"
        style={{ textShadow: '1px 1px 2px black' }}
      >
        {character.name}
      </text>
    </g>
  );
};

// Enhanced projectile animation
const ProjectileAnim: React.FC<{ projectile: Projectile; offsetX: number; offsetY: number }> = ({ projectile, offsetX, offsetY }) => {
  const [progress, setProgress] = useState(0);
  const [showImpact, setShowImpact] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const flightDuration = projectile.duration * 0.5;

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
  const fromY = fromIso.sy + offsetY - 18;
  const toX = toIsoPos.sx + offsetX;
  const toY = toIsoPos.sy + offsetY - 18;

  const currentX = fromX + (toX - fromX) * progress;
  const currentY = fromY + (toY - fromY) * progress;

  if (progress >= 1 && !showImpact) return null;

  return (
    <g>
      {!showImpact && (
        <>
          {/* Tracer line */}
          {progress > 0.05 && (
            <line
              x1={fromX + (toX - fromX) * Math.max(0, progress - 0.1)}
              y1={fromY + (toY - fromY) * Math.max(0, progress - 0.1)}
              x2={currentX}
              y2={currentY}
              stroke="#fbbf24"
              strokeWidth="2.5"
              opacity="0.9"
            />
          )}
          
          {/* Bullet glow */}
          <circle cx={currentX} cy={currentY} r="6" fill="#fbbf24" opacity="0.3">
            <animate attributeName="r" values="6;8;6" dur="0.1s" repeatCount="indefinite" />
          </circle>
          
          {/* Bullet core */}
          <circle cx={currentX} cy={currentY} r="3" fill="#ffffff">
            <animate attributeName="r" values="2.5;3.5;2.5" dur="0.1s" repeatCount="indefinite" />
          </circle>
          
          {/* Muzzle flash */}
          {progress < 0.1 && (
            <>
              <circle cx={fromX} cy={fromY} r={15 * (1 - progress / 0.1)} fill="#ffffff" opacity={0.9 * (1 - progress / 0.1)}>
                <animate attributeName="r" values={`${15 * (1 - progress / 0.1)};${20 * (1 - progress / 0.1)};${15 * (1 - progress / 0.1)}`} dur="0.05s" repeatCount="indefinite" />
              </circle>
              <circle cx={fromX} cy={fromY} r={10 * (1 - progress / 0.1)} fill="#fbbf24" opacity={0.8 * (1 - progress / 0.1)} />
              {/* Flash rays */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const len = 8 * (1 - progress / 0.1);
                return (
                  <line
                    key={i}
                    x1={fromX}
                    y1={fromY}
                    x2={fromX + Math.cos(rad) * len}
                    y2={fromY + Math.sin(rad) * len}
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    opacity={0.7 * (1 - progress / 0.1)}
                  />
                );
              })}
            </>
          )}
        </>
      )}

      {showImpact && (
        <g>
          {projectile.hit ? (
            <>
              {/* Impact flash */}
              <circle cx={toX} cy={toY} r="15" fill={projectile.critical ? '#ef4444' : '#fbbf24'} opacity="0.9">
                <animate attributeName="r" values="5;20;10" dur="0.3s" fill="freeze" />
                <animate attributeName="opacity" values="1;0.5;0" dur="0.4s" fill="freeze" />
              </circle>
              
              {/* Sparks */}
              {Array.from({ length: projectile.critical ? 12 : 6 }).map((_, i) => {
                const angle = (i * 360) / (projectile.critical ? 12 : 6);
                const rad = (angle * Math.PI) / 180;
                const dist = 25 + Math.random() * 10;
                return (
                  <circle key={i} cx={toX} cy={toY} r="2" fill={projectile.critical ? '#ef4444' : '#fbbf24'}>
                    <animate attributeName="cx" values={`${toX};${toX + Math.cos(rad) * dist}`} dur="0.3s" fill="freeze" />
                    <animate attributeName="cy" values={`${toY};${toY + Math.sin(rad) * dist}`} dur="0.3s" fill="freeze" />
                    <animate attributeName="opacity" values="1;0" dur="0.3s" fill="freeze" />
                    <animate attributeName="r" values="2;0" dur="0.3s" fill="freeze" />
                  </circle>
                );
              })}
              
              {/* Damage number */}
              <text
                x={toX}
                y={toY - 25}
                textAnchor="middle"
                fontSize="16"
                fontWeight="bold"
                fill={projectile.critical ? '#ef4444' : '#fbbf24'}
                style={{ textShadow: '2px 2px 4px black' }}
              >
                {projectile.critical ? '💥 КРИТ!' : `-${projectile.damage}`}
                <animate attributeName="y" values={`${toY - 25};${toY - 50}`} dur="0.8s" fill="freeze" />
                <animate attributeName="opacity" values="1;0" dur="1s" fill="freeze" />
              </text>
              
              {projectile.killed && (
                <text x={toX} y={toY - 55} textAnchor="middle" fontSize="18" fill="#ef4444" fontWeight="bold">
                  ☠️ УБИТ!
                  <animate attributeName="opacity" values="1;0" dur="1.2s" fill="freeze" />
                </text>
              )}
            </>
          ) : (
            <>
              {/* Miss effect - dust cloud */}
              <circle cx={toX} cy={toY} r="8" fill="#9ca3af" opacity="0.6">
                <animate attributeName="r" values="3;12" dur="0.4s" fill="freeze" />
                <animate attributeName="opacity" values="0.8;0" dur="0.4s" fill="freeze" />
              </circle>
              <text x={toX} y={toY - 15} textAnchor="middle" fontSize="11" fill="#9ca3af" fontStyle="italic">
                промах
                <animate attributeName="opacity" values="1;0" dur="0.6s" fill="freeze" />
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
        <defs>
          {/* Grass pattern */}
          <pattern id="grassPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#5a8f4a" />
            <circle cx="2" cy="2" r="0.5" fill="#4a7c3f" opacity="0.5" />
            <circle cx="6" cy="6" r="0.5" fill="#6a9f5a" opacity="0.3" />
          </pattern>
          
          {/* Water animation */}
          <pattern id="waterPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#3b82f6" />
            <path d="M 0 10 Q 5 8, 10 10 T 20 10" stroke="#60a5fa" strokeWidth="0.5" fill="none" opacity="0.5">
              <animate attributeName="d" values="M 0 10 Q 5 8, 10 10 T 20 10;M 0 10 Q 5 12, 10 10 T 20 10;M 0 10 Q 5 8, 10 10 T 20 10" dur="3s" repeatCount="indefinite" />
            </path>
          </pattern>
        </defs>

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
            <g key={`tile-${x}-${y}`} onClick={() => onTileClick(x, y)} className="cursor-pointer">
              {isWall ? (
                <>
                  {(() => {
                    const paths = wallPaths(cx, cy, WALL_HEIGHT);
                    return (
                      <>
                        <path d={paths.left} fill={colors.left} stroke="#000" strokeWidth="0.5" />
                        <path d={paths.right} fill={colors.right} stroke="#000" strokeWidth="0.5" />
                        <path d={paths.top} fill={colors.top} stroke="#000" strokeWidth="0.5" />
                        {/* Building details - windows */}
                        {tile.type === 'building' && (
                          <>
                            <rect x={cx - 8} y={cy - WALL_HEIGHT + 5} width={4} height={6} fill="#2d2d2d" opacity="0.6" />
                            <rect x={cx + 4} y={cy - WALL_HEIGHT + 5} width={4} height={6} fill="#2d2d2d" opacity="0.6" />
                          </>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <path
                    d={diamondPath(cx, cy)}
                    fill={tile.type === 'grass' ? 'url(#grassPattern)' : tile.type === 'water' ? 'url(#waterPattern)' : colors.top}
                    stroke="#00000030"
                    strokeWidth="0.5"
                  />
                  {tile.type === 'tree' && (
                    <>
                      {/* Tree trunk */}
                      <rect x={cx - 2} y={cy - 18} width={4} height={14} fill="#5c3d1e" rx="1" />
                      {/* Tree canopy with animation */}
                      <g>
                        <ellipse cx={cx} cy={cy - 22} rx={11} ry={13} fill="#2d7a22">
                          <animate attributeName="rx" values="11;11.5;11" dur="4s" repeatCount="indefinite" />
                        </ellipse>
                        <ellipse cx={cx - 5} cy={cy - 20} rx={8} ry={10} fill="#3d8f34" />
                        <ellipse cx={cx + 5} cy={cy - 24} rx={7} ry={9} fill="#4aa340" />
                        {/* Leaf details */}
                        <circle cx={cx - 3} cy={cy - 25} r={2} fill="#5ab350" opacity="0.7" />
                        <circle cx={cx + 4} cy={cy - 20} r={1.5} fill="#5ab350" opacity="0.6" />
                      </g>
                    </>
                  )}
                  {tile.type === 'road' && (
                    <>
                      <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke="#ffffff20" strokeWidth="1.5" strokeDasharray="4,3" />
                      {/* Road texture */}
                      <circle cx={cx - 5} cy={cy - 2} r={0.5} fill="#00000020" />
                      <circle cx={cx + 3} cy={cy + 1} r={0.5} fill="#00000020" />
                    </>
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
                  opacity="0.4"
                  stroke="#60a5fa"
                  strokeWidth="2"
                >
                  <animate attributeName="opacity" values="0.4;0.6;0.4" dur="1.5s" repeatCount="indefinite" />
                </path>
              )}

              {isAttack && !isWall && (
                <path
                  d={diamondPath(cx, cy)}
                  fill="#ef4444"
                  opacity="0.35"
                  stroke="#f87171"
                  strokeWidth="2.5"
                >
                  <animate attributeName="opacity" values="0.35;0.55;0.35" dur="1s" repeatCount="indefinite" />
                </path>
              )}

              {character && (() => {
                // Use visualPosition for smooth animation if available
                const charPos = character.visualPosition || character.position;
                const charIso = toIso(charPos.x, charPos.y);
                const charCx = charIso.sx + offsetX;
                const charCy = charIso.sy + offsetY;
                return (
                  <g style={{ transition: 'transform 0.3s ease-out' }}>
                    <CharacterSprite character={character} cx={charCx} cy={charCy} selected={selected} />
                  </g>
                );
              })()}
            </g>
          );
        })}

        {projectiles.map(proj => (
          <ProjectileAnim key={proj.id} projectile={proj} offsetX={offsetX} offsetY={offsetY} />
        ))}
      </svg>
    </div>
  );
};

export default GameMap;
