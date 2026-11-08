export interface Position {
  x: number;
  y: number;
}

export interface Weapon {
  name: string;
  damage: number;
  range: number;
  apCost: number;
  accuracy: number;
  icon: string;
}

export interface Character {
  id: string;
  name: string;
  position: Position;
  visualPosition?: Position; // For smooth animation
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  stats: {
    health: number;
    agility: number;
    dexterity: number;
    marksmanship: number;
    leadership: number;
  };
  weapon: Weapon;
  isEnemy: boolean;
  isAlive: boolean;
  color: string;
  portrait: string;
}

export type TileType = 'grass' | 'dirt' | 'road' | 'wall' | 'tree' | 'building' | 'water' | 'floor';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
  coverBonus: number;
  isInside?: boolean; // Mark if tile is inside a building
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isHorizontal: boolean;
}

export interface GameState {
  map: Tile[][];
  characters: Character[];
  selectedCharacter: Character | null;
  turn: 'player' | 'enemy';
  turnNumber: number;
  actionMode: 'move' | 'attack' | 'none';
  validMoves: Position[];
  validAttacks: Position[];
  combatLog: string[];
  gameOver: boolean;
  winner: string | null;
}

export interface CombatResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  killed: boolean;
  message: string;
}

export interface Projectile {
  id: string;
  from: Position;
  to: Position;
  startTime: number;
  duration: number;
  hit: boolean;
  critical: boolean;
  damage: number;
  killed: boolean;
  attackerName: string;
  targetName: string;
}
