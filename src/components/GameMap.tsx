import React from 'react';
import { Tile, Character, Position } from '../types';
import { TILE_SIZE } from '../gameData';

interface GameMapProps {
  map: Tile[][];
  characters: Character[];
  selectedCharacter: Character | null;
  validMoves: Position[];
  validAttacks: Position[];
  actionMode: 'move' | 'attack' | 'none';
  onTileClick: (x: number, y: number) => void;
}

const getTileColor = (tile: Tile): string => {
  switch (tile.type) {
    case 'grass': return '#4a7c3f';
    case 'dirt': return '#8b7355';
    case 'road': return '#9e9e9e';
    case 'wall': return '#5c5c5c';
    case 'tree': return '#2d5a27';
    case 'building': return '#6b5b4f';
    case 'water': return '#2563eb';
    default: return '#4a7c3f';
  }
};

const getTileIcon = (tile: Tile): string => {
  switch (tile.type) {
    case 'tree': return '🌲';
    case 'building': return '🏠';
    case 'wall': return '🧱';
    case 'water': return '🌊';
    default: return '';
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

  return (
    <div className="relative border-2 border-gray-700 rounded-lg overflow-hidden shadow-2xl">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${map[0].length}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${map.length}, ${TILE_SIZE}px)`,
        }}
      >
        {map.map((row, y) =>
          row.map((tile, x) => {
            const character = getCharacterAt(x, y);
            const isMove = isValidMove(x, y);
            const isAttack = isValidAttack(x, y);
            const selected = isSelected(x, y);

            return (
              <div
                key={`${x}-${y}`}
                className={`
                  relative flex items-center justify-center cursor-pointer
                  border border-black/10 transition-all duration-100
                  ${isMove ? 'ring-2 ring-inset ring-blue-400 bg-blue-400/30' : ''}
                  ${isAttack ? 'ring-2 ring-inset ring-red-500 bg-red-500/30' : ''}
                  ${selected ? 'ring-2 ring-inset ring-yellow-400' : ''}
                  hover:brightness-125
                `}
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  backgroundColor: getTileColor(tile),
                }}
                onClick={() => onTileClick(x, y)}
              >
                {/* Tile icon */}
                {getTileIcon(tile) && !character && (
                  <span className="text-lg opacity-80">{getTileIcon(tile)}</span>
                )}

                {/* Cover indicator */}
                {tile.coverBonus > 0 && !character && (
                  <div className="absolute bottom-0 right-0 text-[8px] bg-black/50 text-yellow-300 px-0.5 rounded-tl">
                    {tile.coverBonus}
                  </div>
                )}

                {/* Character */}
                {character && (
                  <div className={`
                    absolute inset-0 flex items-center justify-center
                    ${character.isEnemy ? 'animate-pulse' : ''}
                  `}>
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-lg
                        border-2 shadow-lg
                        ${selected ? 'border-yellow-400 scale-110' : 'border-black/30'}
                      `}
                      style={{ backgroundColor: character.color }}
                    >
                      {character.portrait}
                    </div>
                    {/* HP bar */}
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-7 h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(character.hp / character.maxHp) * 100}%`,
                          backgroundColor: character.hp / character.maxHp > 0.5 ? '#22c55e' : character.hp / character.maxHp > 0.25 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Move indicator */}
                {isMove && !character && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-400/60 animate-pulse" />
                  </div>
                )}

                {/* Attack indicator */}
                {isAttack && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 text-red-500 text-center text-xs font-bold">✕</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameMap;
