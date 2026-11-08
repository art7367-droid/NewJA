import React from 'react';
import { Character } from '../types';

interface CharacterPanelProps {
  character: Character | null;
  allCharacters: Character[];
  onSelectCharacter: (char: Character) => void;
}

const CharacterPanel: React.FC<CharacterPanelProps> = ({ character, allCharacters, onSelectCharacter }) => {
  const mercs = allCharacters.filter(c => !c.isEnemy);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-1.5 w-full h-full flex flex-col">
      <h3 className="text-yellow-400 font-bold text-[10px] mb-1 border-b border-gray-600 pb-0.5">
        ⚔️ ОТРЯД
      </h3>
      
      {/* Character roster - horizontal layout */}
      <div className="flex gap-1 mb-1.5">
        {mercs.map(merc => (
          <button
            key={merc.id}
            onClick={() => merc.isAlive && onSelectCharacter(merc)}
            className={`
              flex-1 flex flex-col items-center gap-0.5 p-1 rounded text-[9px] transition-all
              ${!merc.isAlive ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'}
              ${character?.id === merc.id ? 'bg-gray-600 ring-1 ring-yellow-400' : 'bg-gray-700/50'}
            `}
          >
            <span className="text-base">{merc.portrait}</span>
            <span className="text-white font-medium leading-tight truncate w-full text-center">{merc.name}</span>
            <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(merc.hp / merc.maxHp) * 100}%`,
                  backgroundColor: merc.hp / merc.maxHp > 0.5 ? '#22c55e' : merc.hp / merc.maxHp > 0.25 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="text-gray-400 text-[8px]">{merc.hp}/{merc.maxHp}</span>
          </button>
        ))}
      </div>

      {/* Selected character details */}
      {character && (
        <div className="bg-gray-900/50 rounded p-1.5 border border-gray-600 flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">{character.portrait}</span>
            <div className="min-w-0 flex-1">
              <div className="text-white font-bold text-[10px] truncate">{character.name}</div>
              <div className="text-gray-400 text-[9px] truncate">{character.weapon.icon} {character.weapon.name}</div>
            </div>
            <div className="text-right text-[9px]">
              <div className="text-green-400">❤️ {character.hp}/{character.maxHp}</div>
              <div className="text-blue-400">⚡ {character.ap}/{character.maxAp}</div>
            </div>
          </div>

          {/* Stats - compact horizontal */}
          <div className="flex gap-2 text-[9px] border-t border-gray-700 pt-1">
            <div className="flex items-center gap-0.5">
              <span className="text-gray-500">🎯</span>
              <span className="text-yellow-400">{character.stats.marksmanship}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-gray-500">🏃</span>
              <span className="text-cyan-400">{character.stats.agility}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-gray-500">🤸</span>
              <span className="text-purple-400">{character.stats.dexterity}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-gray-500">💪</span>
              <span className="text-red-400">{character.stats.health}</span>
            </div>
          </div>

          {/* Weapon info - single line */}
          <div className="bg-gray-800 rounded px-1.5 py-0.5 text-[9px] border border-gray-700 flex items-center gap-2">
            <span className="text-gray-400">🔫</span>
            <span className="text-red-300">Урон: {character.weapon.damage}</span>
            <span className="text-blue-300">Дальн: {character.weapon.range}</span>
            <span className="text-yellow-300">Точн: {character.weapon.accuracy}%</span>
            <span className="text-orange-300">АП: {character.weapon.apCost}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterPanel;
