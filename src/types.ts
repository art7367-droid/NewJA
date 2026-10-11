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

export type TileType = 'grass' | 'dirt' | 'road' | 'wall' | 'tree' | 'building' | 'water';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
  coverBonus: number;
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
