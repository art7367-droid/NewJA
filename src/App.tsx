import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Character } from './types';
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

function App() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

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

    // Process enemy turn with delay for visual effect
    setTimeout(() => {
      setGameState(prev => {
        const result = executeEnemyTurn(prev);
        const newLog = [...prev.combatLog];
        
        for (const move of result.moves) {
          newLog.push(`${move.character.portrait} ${move.character.name}: ${move.action}`);
        }

        const gameOverCheck = checkGameOver(prev.characters);

        return {
          ...prev,
          combatLog: newLog,
          gameOver: gameOverCheck.over,
          winner: gameOverCheck.winner,
        };
      });

      // Start new player turn
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
      }, 1000);
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

      {/* Main content */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Left panel - Characters */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
          <CharacterPanel
            character={gameState.selectedCharacter}
            allCharacters={gameState.characters}
            onSelectCharacter={selectCharacter}
          />
          
          {/* Actions */}
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
            <h3 className="text-yellow-400 font-bold text-sm mb-2 border-b border-gray-600 pb-1">
              🎮 ДЕЙСТВИЯ
            </h3>
            <div className="space-y-2">
              <button
                onClick={endTurn}
                disabled={gameState.turn !== 'player' || gameState.gameOver || isEnemyTurn}
                className={`
                  w-full py-2 px-3 rounded font-bold text-sm transition-all
                  ${gameState.turn === 'player' && !gameState.gameOver && !isEnemyTurn
                    ? 'bg-green-700 hover:bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                `}
              >
                ⏭️ Завершить ход (E)
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
                className="w-full py-1.5 px-3 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all"
              >
                ❌ Снять выделение (Esc)
              </button>
            </div>

            {gameState.selectedCharacter && (
              <div className="mt-3 pt-2 border-t border-gray-600">
                <div className="text-xs text-gray-400 mb-1">Режим:</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, actionMode: 'move' }))}
                    className={`flex-1 py-1 px-2 rounded text-xs ${
                      gameState.actionMode === 'move' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    🏃 Двиг.
                  </button>
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, actionMode: 'attack' }))}
                    className={`flex-1 py-1 px-2 rounded text-xs ${
                      gameState.actionMode === 'attack' ? 'bg-red-700 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    🎯 Атака
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center - Map */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <GameMap
            map={gameState.map}
            characters={gameState.characters}
            selectedCharacter={gameState.selectedCharacter}
            validMoves={gameState.actionMode === 'move' || gameState.actionMode === 'none' ? gameState.validMoves : []}
            validAttacks={gameState.actionMode === 'attack' || gameState.actionMode === 'none' ? gameState.validAttacks : []}
            actionMode={gameState.actionMode}
            onTileClick={handleTileClick}
          />

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-400">
            <span>🟦 — движение</span>
            <span>🟥 — атака</span>
            <span>🟨 — выбран</span>
            <span>Цифры — укрытие</span>
          </div>
        </div>

        {/* Right panel - Log */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <CombatLog log={gameState.combatLog} />
          
          {/* Enemy info */}
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
            <h3 className="text-red-400 font-bold text-sm mb-2 border-b border-gray-600 pb-1">
              💀 ПРОТИВНИК
            </h3>
            <div className="space-y-1">
              {gameState.characters.filter(c => c.isEnemy && c.isAlive).map(enemy => (
                <div key={enemy.id} className="flex items-center gap-2 text-xs bg-gray-900/50 rounded p-1.5">
                  <span className="text-lg">{enemy.portrait}</span>
                  <div className="flex-1">
                    <div className="text-gray-300">{enemy.name}</div>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-500">{enemy.hp}/{enemy.maxHp}</span>
                    </div>
                    <div className="text-gray-500">{enemy.weapon.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Help */}
          {showHelp && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
              <h3 className="text-cyan-400 font-bold text-sm mb-2 border-b border-gray-600 pb-1">
                📖 УПРАВЛЕНИЕ
              </h3>
              <div className="text-xs text-gray-400 space-y-1">
                <p>1. Выберите наёмника из списка</p>
                <p>2. <span className="text-blue-400">Синие клетки</span> — движение (2 АП/клетка)</p>
                <p>3. <span className="text-red-400">Красные метки</span> — цели для атаки</p>
                <p>4. Нажмите "Завершить ход" или <kbd className="bg-gray-700 px-1 rounded">E</kbd></p>
                <p>5. <kbd className="bg-gray-700 px-1 rounded">Esc</kbd> — снять выделение</p>
                <p className="text-yellow-400 pt-1">💡 Укрытия снижают шанс попадания!</p>
              </div>
            </div>
          )}
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
