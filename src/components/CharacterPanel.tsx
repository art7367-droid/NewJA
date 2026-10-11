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
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-2 w-full h-full flex flex-col">
      <h3 className="text-yellow-400 font-bold text-xs mb-1.5 border-b border-gray-600 pb-1">
        ⚔️ ОТРЯД
      </h3>
      
      {/* Character roster */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        {mercs.map(merc => (
          <button
            key={merc.id}
            onClick={() => merc.isAlive && onSelectCharacter(merc)}
            className={`
              flex items-center gap-1 p-1 rounded text-[10px] transition-all
              ${!merc.isAlive ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'}
              ${character?.id === merc.id ? 'bg-gray-600 ring-1 ring-yellow-400' : 'bg-gray-700/50'}
            `}
          >
            <span className="text-sm">{merc.portrait}</span>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-white font-medium leading-tight truncate w-full">{merc.name}</span>
              <div className="flex items-center gap-0.5">
                <div className="w-10 h-1 bg-gray-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(merc.hp / merc.maxHp) * 100}%`,
                      backgroundColor: merc.hp / merc.maxHp > 0.5 ? '#22c55e' : merc.hp / merc.maxHp > 0.25 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-gray-400 text-[9px]">{merc.hp}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected character details */}
      {character && (
        <div className="bg-gray-900/50 rounded p-1.5 border border-gray-600 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xl">{character.portrait}</span>
            <div className="min-w-0">
              <div className="text-white font-bold text-xs truncate">{character.name}</div>
              <div className="text-gray-400 text-[10px] truncate">{character.weapon.icon} {character.weapon.name}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] mb-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">❤️ HP:</span>
              <span className="text-green-400">{character.hp}/{character.maxHp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">⚡ AP:</span>
              <span className="text-blue-400">{character.ap}/{character.maxAp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">🎯 Метк.:</span>
              <span className="text-yellow-400">{character.stats.marksmanship}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">🏃 Ловк.:</span>
              <span className="text-cyan-400">{character.stats.agility}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">🤸 Ловк.:</span>
              <span className="text-purple-400">{character.stats.dexterity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">💪 Здор.:</span>
              <span className="text-red-400">{character.stats.health}</span>
            </div>
          </div>

          {/* Weapon info */}
          <div className="bg-gray-800 rounded p-1 text-[10px] border border-gray-700">
            <div className="text-gray-300 font-bold mb-0.5">🔫 Оружие:</div>
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
              <span className="text-gray-400">Урон:</span>
              <span className="text-red-300">{character.weapon.damage}</span>
              <span className="text-gray-400">Дальн.:</span>
              <span className="text-blue-300">{character.weapon.range} кл.</span>
              <span className="text-gray-400">Точн.:</span>
              <span className="text-yellow-300">{character.weapon.accuracy}%</span>
              <span className="text-gray-400">АП:</span>
              <span className="text-orange-300">{character.weapon.apCost}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterPanel;
