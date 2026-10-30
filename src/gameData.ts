import { Character, Tile, TileType, Weapon } from './types';

export const MAP_WIDTH = 15;
export const MAP_HEIGHT = 15;
export const TILE_SIZE = 40;

const weapons: Record<string, Weapon> = {
  m16: { name: 'M16A2', damage: 25, range: 8, apCost: 4, accuracy: 75, icon: '🔫' },
  mp5: { name: 'MP5K', damage: 18, range: 5, apCost: 3, accuracy: 80, icon: '🔫' },
  shotgun: { name: 'SPAS-12', damage: 40, range: 3, apCost: 5, accuracy: 65, icon: '🔫' },
  sniper: { name: 'Barrett M82', damage: 55, range: 12, apCost: 6, accuracy: 85, icon: '🎯' },
  pistol: { name: 'Desert Eagle', damage: 20, range: 4, apCost: 2, accuracy: 70, icon: '🔫' },
  rpg: { name: 'RPG-7', damage: 70, range: 6, apCost: 8, accuracy: 50, icon: '💥' },
};

export const createMercs = (): Character[] => [
  {
    id: 'merc1',
    name: 'Гризли',
    position: { x: 1, y: 7 },
    hp: 120,
    maxHp: 120,
    ap: 25,
    maxAp: 25,
    stats: { health: 85, agility: 60, dexterity: 70, marksmanship: 80, leadership: 50 },
    weapon: weapons.m16,
    isEnemy: false,
    isAlive: true,
    color: '#22c55e',
    portrait: '🧔',
  },
  {
    id: 'merc2',
    name: 'Линкс',
    position: { x: 1, y: 8 },
    hp: 90,
    maxHp: 90,
    ap: 30,
    maxAp: 30,
    stats: { health: 65, agility: 90, dexterity: 85, marksmanship: 75, leadership: 40 },
    weapon: weapons.mp5,
    isEnemy: false,
    isAlive: true,
    color: '#3b82f6',
    portrait: '👨‍🦰',
  },
  {
    id: 'merc3',
    name: 'Хок',
    position: { x: 2, y: 9 },
    hp: 100,
    maxHp: 100,
    ap: 22,
    maxAp: 22,
    stats: { health: 75, agility: 55, dexterity: 60, marksmanship: 95, leadership: 70 },
    weapon: weapons.sniper,
    isEnemy: false,
    isAlive: true,
    color: '#a855f7',
    portrait: '🧑‍🦱',
  },
  {
    id: 'merc4',
    name: 'Бульдог',
    position: { x: 1, y: 10 },
    hp: 150,
    maxHp: 150,
    ap: 20,
    maxAp: 20,
    stats: { health: 95, agility: 40, dexterity: 50, marksmanship: 60, leadership: 80 },
    weapon: weapons.shotgun,
    isEnemy: false,
    isAlive: true,
    color: '#f59e0b',
    portrait: '👨‍🦲',
  },
];

export const createEnemies = (): Character[] => [
  {
    id: 'enemy1',
    name: 'Солдат',
    position: { x: 11, y: 3 },
    hp: 60,
    maxHp: 60,
    ap: 20,
    maxAp: 20,
    stats: { health: 50, agility: 50, dexterity: 50, marksmanship: 55, leadership: 30 },
    weapon: { ...weapons.pistol, name: 'АК-74' },
    isEnemy: true,
    isAlive: true,
    color: '#ef4444',
    portrait: '💀',
  },
  {
    id: 'enemy2',
    name: 'Солдат',
    position: { x: 13, y: 5 },
    hp: 60,
    maxHp: 60,
    ap: 20,
    maxAp: 20,
    stats: { health: 50, agility: 50, dexterity: 50, marksmanship: 55, leadership: 30 },
    weapon: { ...weapons.pistol, name: 'АК-74' },
    isEnemy: true,
    isAlive: true,
    color: '#ef4444',
    portrait: '💀',
  },
  {
    id: 'enemy3',
    name: 'Снайпер',
    position: { x: 13, y: 1 },
    hp: 45,
    maxHp: 45,
    ap: 18,
    maxAp: 18,
    stats: { health: 35, agility: 60, dexterity: 70, marksmanship: 90, leadership: 20 },
    weapon: weapons.sniper,
    isEnemy: true,
    isAlive: true,
    color: '#dc2626',
    portrait: '🎯',
  },
  {
    id: 'enemy4',
    name: 'Тяжёлый',
    position: { x: 12, y: 8 },
    hp: 100,
    maxHp: 100,
    ap: 15,
    maxAp: 15,
    stats: { health: 80, agility: 30, dexterity: 40, marksmanship: 60, leadership: 40 },
    weapon: weapons.rpg,
    isEnemy: true,
    isAlive: true,
    color: '#991b1b',
    portrait: '☠️',
  },
  {
    id: 'enemy5',
    name: 'Солдат',
    position: { x: 13, y: 11 },
    hp: 60,
    maxHp: 60,
    ap: 20,
    maxAp: 20,
    stats: { health: 50, agility: 50, dexterity: 50, marksmanship: 55, leadership: 30 },
    weapon: { ...weapons.pistol, name: 'АК-74' },
    isEnemy: true,
    isAlive: true,
    color: '#ef4444',
    portrait: '💀',
  },
];

const generateMap = (): Tile[][] => {
  const map: Tile[][] = [];
  
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      let type: TileType = 'grass';
      let walkable = true;
      let coverBonus = 0;

      // Горизонтальная дорога через центр
      if (y === 7) {
        type = 'road';
      }
      // Вертикальная дорога
      else if (x === 7) {
        type = 'road';
      }
      // Здание с полом внутри (можно заходить)
      else if (x >= 5 && x <= 7 && y >= 2 && y <= 4) {
        type = 'floor';
        walkable = true;
        coverBonus = 0;
      }
      // Дверь здания (проём в стене)
      else if (x === 6 && y === 5) {
        type = 'floor';
        walkable = true;
        coverBonus = 0;
      }
      // Малое здание справа
      else if (x >= 10 && x <= 11 && y >= 10 && y <= 11) {
        type = 'building';
        walkable = false;
      }
      // Стены малого здания
      else if (
        ((x === 9 || x === 12) && y >= 10 && y <= 11) ||
        (x >= 10 && x <= 11 && (y === 9 || y === 12))
      ) {
        type = 'wall';
        walkable = false;
        coverBonus = 30;
      }
      // Деревья
      else if (
        (x === 3 && y === 3) || (x === 10 && y === 2) || (x === 12 && y === 4) ||
        (x === 3 && y === 11) || (x === 5 && y === 13) || (x === 13 && y === 13) ||
        (x === 1 && y === 4) || (x === 14 && y === 7) || (x === 9 && y === 13)
      ) {
        type = 'tree';
        walkable = false;
        coverBonus = 20;
      }
      // Водоем в правом нижнем углу
      else if (x >= 13 && x <= 14 && y >= 12 && y <= 13) {
        type = 'water';
        walkable = false;
      }
      // Грязевые участки
      else if (
        (x === 9 && y >= 8 && y <= 9) ||
        (x === 4 && y === 9)
      ) {
        type = 'dirt';
        coverBonus = 5;
      }

      row.push({ x, y, type, walkable, coverBonus });
    }
    map.push(row);
  }
  
  return map;
};

export const initialMap = generateMap();
