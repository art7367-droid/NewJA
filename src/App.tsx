import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Character, Projectile } from './types';
import { createMercs, createEnemies, initialMap } from './gameData';
import {
  getMovementRange,
  getAttackRange,
  resolveCombat,
  executeEnemyTurn,
  checkGameOver,
} from './gameLogic';
import GameMap from './components/GameMap';
import CharacterPanel from './components/CharacterPanel';
import CombatLog from './components/CombatLog';

const initialState: GameState = {
  map: initialMap,
  characters: [...createMercs(), ...createEnemies()],
  selectedCharacter: null,
  turn: 'player',
  turnNumber: 1,
  actionMode: 'none',
  validMoves: [],
  validAttacks: [],
  combatLog: ['=== Ход 1 — Ваш ход ==='],
  gameOver: false,
  winner: null,
};

let projectileIdCounter = 0;

function App() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);

  const selectCharacter = useCallback((char: Character) => {
    if (gameState.turn !== 'player' || gameState.gameOver) return;
    if (char.isEnemy || !char.isAlive) return;

    setGameState(prev => {
      const validMoves = getMovementRange(char, prev.map, prev.characters);
      const validAttacks = getAttackRange(char, prev.characters);

      return {
        ...prev,
        selectedCharacter: char,
        actionMode: 'move',
        validMoves,
        validAttacks,
      };
    });
  }, [gameState.turn, gameState.gameOver]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (gameState.turn !== 'player' || gameState.gameOver || isEnemyTurn) return;

    const { selectedCharacter, validMoves, validAttacks, characters, map } = gameState;

    if (!selectedCharacter) return;

    // Check if clicked on another friendly character
    const clickedChar = characters.find(c => c.isAlive && c.position.x === x && c.position.y === y);
    if (clickedChar && !clickedChar.isEnemy) {
      selectCharacter(clickedChar);
      return;
    }

    // Check if this is an attack target
    const isAttackTarget = validAttacks.some(p => p.x === x && p.y === y);
    if (isAttackTarget && selectedCharacter.ap >= selectedCharacter.weapon.apCost) {
      const target = characters.find(c => c.isAlive && c.position.x === x && c.position.y === y);
      if (target) {
        const result = resolveCombat(selectedCharacter, target, map);

        // Create projectile animation
        const newProjectile: Projectile = {
          id: `proj-${projectileIdCounter++}`,
          from: { ...selectedCharacter.position },
          to: { ...target.position },
          startTime: Date.now(),
          duration: 400, // Fast bullet flight
          hit: result.hit,
          critical: result.critical,
          damage: result.damage,
          killed: result.killed,
          attackerName: selectedCharacter.name,
          targetName: target.name,
        };

        setProjectiles(prev => [...prev, newProjectile]);

        // Remove projectile after animation
        setTimeout(() => {
          setProjectiles(prev => prev.filter(p => p.id !== newProjectile.id));
        }, 600);

        setGameState(prev => {
          const newChars = prev.characters.map(c => {
            if (c.id === target.id) {
              return {
                ...c,
                hp: Math.max(0, c.hp - result.damage),
                isAlive: !result.killed,
              };
            }
            if (c.id === selectedCharacter.id) {
              return { ...c, ap: c.ap - selectedCharacter.weapon.apCost };
            }
            return c;
          });

          const updatedSelected = newChars.find(c => c.id === selectedCharacter.id)!;
          const newValidMoves = updatedSelected.ap >= 2
            ? getMovementRange(updatedSelected, prev.map, newChars)
            : [];
          const newValidAttacks = updatedSelected.ap >= updatedSelected.weapon.apCost
            ? getAttackRange(updatedSelected, newChars)
            : [];

          const gameOverCheck = checkGameOver(newChars);

          return {
            ...prev,
            characters: newChars,
            selectedCharacter: updatedSelected,
            validMoves: newValidMoves,
            validAttacks: newValidAttacks,
            combatLog: [...prev.combatLog, result.message],
            gameOver: gameOverCheck.over,
            winner: gameOverCheck.winner,
          };
        });
        return;
      }
    }

    // Check if this is a valid move
    const isMoveTarget = validMoves.some(p => p.x === x && p.y === y);
    if (isMoveTarget) {
      const moveCost = 2;

      setGameState(prev => {
        const newChars = prev.characters.map(c => {
          if (c.id === selectedCharacter.id) {
            return {
              ...c,
              visualPosition: { ...c.position }, // Store current position for animation
              position: { x, y },
              ap: c.ap - moveCost,
            };
          }
          return c;
        });

        const updatedSelected = newChars.find(c => c.id === selectedCharacter.id)!;
        const newValidMoves = updatedSelected.ap >= 2
          ? getMovementRange(updatedSelected, prev.map, newChars)
          : [];
        const newValidAttacks = updatedSelected.ap >= updatedSelected.weapon.apCost
          ? getAttackRange(updatedSelected, newChars)
          : [];

        return {
          ...prev,
          characters: newChars,
          selectedCharacter: updatedSelected,
          validMoves: newValidMoves,
          validAttacks: newValidAttacks,
          combatLog: [...prev.combatLog, `${selectedCharacter.name} перемещается`],
        };
      });

      // Clear visual position after animation
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          characters: prev.characters.map(c => ({
            ...c,
            visualPosition: undefined,
          })),
        }));
      }, 500); // Increased from 300ms to 500ms for better step animation
    }
  }, [gameState, isEnemyTurn, selectCharacter]);

  const endTurn = useCallback(() => {
    if (gameState.turn !== 'player' || gameState.gameOver) return;

    setIsEnemyTurn(true);

    setGameState(prev => ({
      ...prev,
      turn: 'enemy',
      selectedCharacter: null,
      validMoves: [],
      validAttacks: [],
      combatLog: [...prev.combatLog, `--- Ход противника ---`],
    }));

    // Process enemy turn with sequential delays
    setTimeout(() => {
      const result = executeEnemyTurn(gameState);
      
      // Execute each action with its delay
      result.actions.forEach((action, index) => {
        setTimeout(() => {
          setGameState(prev => {
            const newLog = [...prev.combatLog, `${action.character.portrait} ${action.character.name}: ${action.action}`];
            
            // Create projectile animation for enemy attacks
            if (action.type === 'attack' && action.target && action.result) {
              const enemyProjectile: Projectile = {
                id: `proj-${projectileIdCounter++}`,
                from: { ...action.character.position },
                to: { ...action.target.position },
                startTime: Date.now(),
                duration: 400, // Fast bullet flight
                hit: action.result.hit,
                critical: action.result.critical,
                damage: action.result.damage,
                killed: action.result.killed,
                attackerName: action.character.name,
                targetName: action.target.name,
              };
              
              setProjectiles(p => [...p, enemyProjectile]);
              setTimeout(() => {
                setProjectiles(p => p.filter(pr => pr.id !== enemyProjectile.id));
              }, 600);
            }

            const gameOverCheck = checkGameOver(prev.characters);

            return {
              ...prev,
              combatLog: newLog,
              gameOver: gameOverCheck.over,
              winner: gameOverCheck.winner,
            };
          });
        }, action.delay);
      });

      // Start new player turn after all enemy actions
      const totalEnemyTime = result.actions.length > 0 
        ? result.actions[result.actions.length - 1].delay + 1000 
        : 500;
      
      setTimeout(() => {
        setGameState(prev => {
          const newTurn = prev.turnNumber + 1;
          const newChars = prev.characters.map(c => {
            if (!c.isEnemy && c.isAlive) {
              return { ...c, ap: c.maxAp };
            }
            if (c.isEnemy && c.isAlive) {
              return { ...c, ap: c.maxAp };
            }
            return c;
          });

          return {
            ...prev,
            characters: newChars,
            turn: 'player',
            turnNumber: newTurn,
            combatLog: [...prev.combatLog, ``, `=== Ход ${newTurn} — Ваш ход ===`],
          };
        });
        setIsEnemyTurn(false);
      }, totalEnemyTime);
    }, 500);
  }, [gameState.turn, gameState.gameOver]);

  const resetGame = useCallback(() => {
    setGameState({
      ...initialState,
      characters: [...createMercs(), ...createEnemies()],
      map: initialMap,
    });
    setIsEnemyTurn(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGameState(prev => ({
          ...prev,
          selectedCharacter: null,
          actionMode: 'none',
          validMoves: [],
          validAttacks: [],
        }));
      }
      if (e.key === 'Enter' || e.key === 'e') {
        endTurn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [endTurn]);

  const aliveMercs = gameState.characters.filter(c => !c.isEnemy && c.isAlive).length;
  const aliveEnemies = gameState.characters.filter(c => c.isEnemy && c.isAlive).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-yellow-400">⚔️ JAGGED TACTICS</h1>
          <span className="text-gray-400 text-sm">Пошаговая тактика</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-400">🟢 {aliveMercs} союзников</span>
            <span className="text-gray-500">vs</span>
            <span className="text-red-400">🔴 {aliveEnemies} врагов</span>
          </div>
          <div className="bg-gray-700 px-3 py-1 rounded text-sm">
            Ход: <span className="text-yellow-400 font-bold">{gameState.turnNumber}</span>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-bold ${
            gameState.turn === 'player' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'
          }`}>
            {isEnemyTurn ? '⏳ Ход врага...' : '🎯 Ваш ход'}
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-400 hover:text-white text-sm"
          >
            ❓
          </button>
        </div>
      </header>

      {/* Main content - Map on top */}
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
        {/* Center - Map */}
        <div className="flex-1 flex flex-col items-center justify-start gap-2 min-h-0">
          <div className="overflow-auto border border-gray-600 rounded-lg bg-gray-900" style={{ maxHeight: 'calc(100vh - 380px)' }}>
            <GameMap
              map={gameState.map}
              characters={gameState.characters}
              selectedCharacter={gameState.selectedCharacter}
              validMoves={gameState.actionMode === 'move' || gameState.actionMode === 'none' ? gameState.validMoves : []}
              validAttacks={gameState.actionMode === 'attack' || gameState.actionMode === 'none' ? gameState.validAttacks : []}
              actionMode={gameState.actionMode}
              onTileClick={handleTileClick}
              projectiles={projectiles}
            />
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-400 flex-wrap justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/50 border border-blue-400 inline-block"></span> движение</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/50 border border-red-400 inline-block"></span> атака</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-yellow-400 inline-block"></span> выбран</span>
            <span className="text-yellow-400">Цифры — бонус укрытия</span>
          </div>
        </div>

        {/* Bottom panels */}
        <div className="flex gap-2 h-56 flex-shrink-0">
          {/* Left - Characters (wider) */}
          <div className="w-96 flex-shrink-0">
            <CharacterPanel
              character={gameState.selectedCharacter}
              allCharacters={gameState.characters}
              onSelectCharacter={selectCharacter}
            />
          </div>
          
          {/* Actions (narrower) */}
          <div className="w-32 flex-shrink-0 bg-gray-800 border border-gray-600 rounded-lg p-2 flex flex-col">
            <h3 className="text-yellow-400 font-bold text-xs mb-1.5 border-b border-gray-600 pb-1">
              🎮 ДЕЙСТВИЯ
            </h3>
            
            {/* Action buttons side by side */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={endTurn}
                disabled={gameState.turn !== 'player' || gameState.gameOver || isEnemyTurn}
                className={`
                  flex-1 py-1 px-1 rounded text-[10px] font-bold transition-all
                  ${gameState.turn === 'player' && !gameState.gameOver && !isEnemyTurn
                    ? 'bg-green-700 hover:bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                `}
              >
                ⏭️ Ход (E)
              </button>
              <button
                onClick={() => {
                  setGameState(prev => ({
                    ...prev,
                    selectedCharacter: null,
                    actionMode: 'none',
                    validMoves: [],
                    validAttacks: [],
                  }));
                }}
                className="flex-1 py-1 px-1 rounded text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all"
              >
                ❌ Снять
              </button>
            </div>

            {/* Mode buttons stacked */}
            {gameState.selectedCharacter && (
              <div className="pt-1.5 border-t border-gray-600">
                <div className="text-[10px] text-gray-400 mb-1">Режим:</div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, actionMode: 'move' }))}
                    className={`w-full py-0.5 px-2 rounded text-[10px] ${
                      gameState.actionMode === 'move' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    🏃 Двиг.
                  </button>
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, actionMode: 'attack' }))}
                    className={`w-full py-0.5 px-2 rounded text-[10px] ${
                      gameState.actionMode === 'attack' ? 'bg-red-700 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    🎯 Атака
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Center - Combat Log */}
          <div className="flex-1 min-w-0 max-w-xs">
            <CombatLog log={gameState.combatLog} />
          </div>

          {/* Right - Enemy info and Help (narrower) */}
          <div className="w-52 flex-shrink-0 flex flex-col gap-1.5">
            {/* Enemy info */}
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-2">
              <h3 className="text-red-400 font-bold text-xs mb-1 border-b border-gray-600 pb-1">
                💀 ПРОТИВНИК
              </h3>
              <div className="space-y-0.5">
                {gameState.characters.filter(c => c.isEnemy && c.isAlive).map(enemy => (
                  <div key={enemy.id} className="flex items-center gap-1.5 text-[10px] bg-gray-900/50 rounded p-1">
                    <span className="text-sm">{enemy.portrait}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-300 truncate">{enemy.name}</div>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1 bg-gray-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-500 text-[9px]">{enemy.hp}/{enemy.maxHp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Help */}
            {showHelp && (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-2 flex-1">
                <h3 className="text-cyan-400 font-bold text-xs mb-1 border-b border-gray-600 pb-1">
                  📖 УПРАВЛЕНИЕ
                </h3>
                <div className="text-[10px] text-gray-400 space-y-0.5">
                  <p>1. Выберите наёмника</p>
                  <p>2. <span className="text-blue-400">Синие</span> — движение</p>
                  <p>3. <span className="text-red-400">Красные</span> — атака</p>
                  <p>4. <kbd className="bg-gray-700 px-0.5 rounded">E</kbd> — завершить ход</p>
                  <p>5. <kbd className="bg-gray-700 px-0.5 rounded">Esc</kbd> — снять</p>
                  <p className="text-yellow-400 pt-0.5">💡 Укрытия = защита!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Over overlay */}
      {gameState.gameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 border-2 border-yellow-500 rounded-xl p-8 text-center max-w-md">
            <h2 className="text-3xl font-bold mb-4">
              {gameState.winner === 'Ваш отряд' ? (
                <span className="text-green-400">🏆 ПОБЕДА!</span>
              ) : (
                <span className="text-red-400">💀 ПОРАЖЕНИЕ</span>
              )}
            </h2>
            <p className="text-gray-300 mb-6">
              {gameState.winner === 'Ваш отряд'
                ? 'Все противники уничтожены! Отличная работа, командир!'
                : 'Ваш отряд уничтожен. Противник захватил позицию.'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Ходов: {gameState.turnNumber} | Убито врагов: {gameState.characters.filter(c => c.isEnemy && !c.isAlive).length}
            </p>
            <button
              onClick={resetGame}
              className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg transition-all"
            >
              🔄 Новая игра
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
