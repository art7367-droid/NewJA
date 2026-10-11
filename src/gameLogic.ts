import { Character, Position, Tile, CombatResult, GameState } from './types';
import { MAP_WIDTH, MAP_HEIGHT } from './gameData';

export const getDistance = (a: Position, b: Position): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

export const getEuclideanDistance = (a: Position, b: Position): number => {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};

export const getMovementRange = (
  character: Character,
  map: Tile[][],
  characters: Character[]
): Position[] => {
  const range: Position[] = [];
  const maxDist = Math.floor(character.ap / 2); // 2 AP per tile
  
  const visited = new Set<string>();
  const queue: { pos: Position; cost: number }[] = [{ pos: character.position, cost: 0 }];
  visited.add(`${character.position.x},${character.position.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.cost > 0) {
      range.push(current.pos);
    }

    if (current.cost >= maxDist) continue;

    const directions = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 },
    ];

    for (const dir of directions) {
      const nx = current.pos.x + dir.x;
      const ny = current.pos.y + dir.y;
      const key = `${nx},${ny}`;

      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
      if (visited.has(key)) continue;
      if (!map[ny][nx].walkable) continue;
      
      const occupied = characters.find(
        c => c.isAlive && c.position.x === nx && c.position.y === ny
      );
      if (occupied) continue;

      visited.add(key);
      queue.push({ pos: { x: nx, y: ny }, cost: current.cost + 1 });
    }
  }

  return range;
};

export const getAttackRange = (
  character: Character,
  characters: Character[]
): Position[] => {
  const range: Position[] = [];
  const weaponRange = character.weapon.range;

  for (const target of characters) {
    if (!target.isAlive) continue;
    if (target.isEnemy === character.isEnemy) continue;
    
    const dist = getEuclideanDistance(character.position, target.position);
    if (dist <= weaponRange) {
      range.push(target.position);
    }
  }

  return range;
};

export const calculateHitChance = (
  attacker: Character,
  target: Character,
  map: Tile[][]
): number => {
  const dist = getEuclideanDistance(attacker.position, target.position);
  
  // Base accuracy from weapon and stats
  let chance = attacker.weapon.accuracy;
  chance += (attacker.stats.marksmanship - 50) * 0.5;
  
  // Distance penalty
  const distPenalty = (dist / attacker.weapon.range) * 20;
  chance -= distPenalty;
  
  // Cover bonus for target
  const targetTile = map[target.position.y][target.position.x];
  chance -= targetTile.coverBonus;
  
  // Agility dodge chance
  chance -= (target.stats.agility - 50) * 0.3;
  
  // HP penalty
  const hpRatio = attacker.hp / attacker.maxHp;
  if (hpRatio < 0.5) {
    chance -= 15;
  }

  return Math.max(5, Math.min(95, Math.round(chance)));
};

export const resolveCombat = (
  attacker: Character,
  target: Character,
  map: Tile[][]
): CombatResult => {
  const hitChance = calculateHitChance(attacker, target, map);
  const roll = Math.random() * 100;
  const hit = roll < hitChance;

  if (!hit) {
    return {
      hit: false,
      damage: 0,
      critical: false,
      killed: false,
      message: `${attacker.name} стреляет в ${target.name} — промах! (${hitChance}%)`,
    };
  }

  // Critical hit check
  const critChance = attacker.stats.dexterity * 0.3;
  const isCrit = Math.random() * 100 < critChance;
  
  let damage = attacker.weapon.damage + Math.floor(Math.random() * 10) - 5;
  if (isCrit) {
    damage = Math.floor(damage * 1.8);
  }

  // Armor reduction based on health stat
  const armor = Math.floor(target.stats.health * 0.2);
  damage = Math.max(1, damage - armor);

  const newHp = target.hp - damage;
  const killed = newHp <= 0;

  return {
    hit: true,
    damage,
    critical: isCrit,
    killed,
    message: `${attacker.name} ${isCrit ? 'КРИТ! ' : ''}попадает в ${target.name} на ${damage} урона!${killed ? ' УБИТ!' : ''} (${hitChance}%)`,
  };
};

export interface EnemyAction {
  type: 'attack' | 'move';
  character: Character;
  action: string;
  target?: Character;
  result?: import('./types').CombatResult;
}

export const executeEnemyTurn = (state: GameState): { actions: EnemyAction[] } => {
  const actions: EnemyAction[] = [];
  const enemies = state.characters.filter(c => c.isEnemy && c.isAlive);
  const playerChars = state.characters.filter(c => !c.isEnemy && c.isAlive);

  for (const enemy of enemies) {
    if (playerChars.length === 0) break;

    // Find closest player
    let closestPlayer: Character | null = null;
    let closestDist = Infinity;

    for (const player of playerChars) {
      const dist = getEuclideanDistance(enemy.position, player.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = player;
      }
    }

    if (!closestPlayer) continue;

    // Try to attack if in range
    if (closestDist <= enemy.weapon.range) {
      const result = resolveCombat(enemy, closestPlayer, state.map);
      actions.push({ type: 'attack', character: enemy, action: result.message, target: closestPlayer, result });
      
      closestPlayer.hp = Math.max(0, closestPlayer.hp - result.damage);
      if (result.killed) {
        closestPlayer.isAlive = false;
      }
      
      enemy.ap = Math.max(0, enemy.ap - enemy.weapon.apCost);
    } else {
      // Move towards closest player
      const dx = Math.sign(closestPlayer.position.x - enemy.position.x);
      const dy = Math.sign(closestPlayer.position.y - enemy.position.y);
      
      const moveSteps = Math.min(Math.floor(enemy.ap / 2), 3);
      let moved = 0;
      
      for (let i = 0; i < moveSteps; i++) {
        const newX = enemy.position.x + (moved < moveSteps / 2 ? dx : 0) + (moved >= moveSteps / 2 ? dx : 0);
        const newY = enemy.position.y + (moved < moveSteps / 2 ? 0 : dy);
        
        // Prefer moving in the axis with greater distance
        const xDist = Math.abs(closestPlayer.position.x - enemy.position.x);
        const yDist = Math.abs(closestPlayer.position.y - enemy.position.y);
        
        let tryX = enemy.position.x;
        let tryY = enemy.position.y;
        
        if (xDist >= yDist) {
          tryX = enemy.position.x + dx;
        } else {
          tryY = enemy.position.y + dy;
        }

        if (
          tryX >= 0 && tryX < MAP_WIDTH &&
          tryY >= 0 && tryY < MAP_HEIGHT &&
          state.map[tryY][tryX].walkable &&
          !state.characters.find(c => c.isAlive && c.position.x === tryX && c.position.y === tryY)
        ) {
          enemy.position = { x: tryX, y: tryY };
          enemy.ap -= 2;
          moved++;
        } else {
          // Try alternative direction
          const altX = enemy.position.x + (dx !== 0 ? 0 : dx);
          const altY = enemy.position.y + (dy !== 0 ? 0 : dy);
          
          if (
            altX >= 0 && altX < MAP_WIDTH &&
            altY >= 0 && altY < MAP_HEIGHT &&
            state.map[altY][altX].walkable &&
            !state.characters.find(c => c.isAlive && c.position.x === altX && c.position.y === altY)
          ) {
            enemy.position = { x: altX, y: altY };
            enemy.ap -= 2;
            moved++;
          }
        }
      }
      
      if (moved > 0) {
        actions.push({ type: 'move', character: enemy, action: `двигается` });
      }
    }
  }

  return { actions };
};

export const checkGameOver = (characters: Character[]): { over: boolean; winner: string | null } => {
  const aliveMercs = characters.filter(c => !c.isEnemy && c.isAlive);
  const aliveEnemies = characters.filter(c => c.isEnemy && c.isAlive);

  if (aliveMercs.length === 0) {
    return { over: true, winner: 'Противник' };
  }
  if (aliveEnemies.length === 0) {
    return { over: true, winner: 'Ваш отряд' };
  }
  return { over: false, winner: null };
};
