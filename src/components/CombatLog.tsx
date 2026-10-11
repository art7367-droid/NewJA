import React, { useEffect, useRef } from 'react';

interface CombatLogProps {
  log: string[];
}

const CombatLog: React.FC<CombatLogProps> = ({ log }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 w-full h-full flex flex-col">
      <h3 className="text-yellow-400 font-bold text-sm mb-2 border-b border-gray-600 pb-1">
        📋 БОЕВОЙ ЖУРНАЛ
      </h3>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto text-xs space-y-0.5 scrollbar-thin"
      >
        {log.length === 0 ? (
          <p className="text-gray-500 italic">Выберите наёмника и начните ход...</p>
        ) : (
          log.map((entry, i) => (
            <div
              key={i}
              className={`
                py-0.5 px-1 rounded
                ${entry.includes('КРИТ') ? 'text-yellow-300 bg-yellow-900/20' : ''}
                ${entry.includes('УБИТ') ? 'text-red-400 bg-red-900/20 font-bold' : ''}
                ${entry.includes('промах') ? 'text-gray-500' : ''}
                ${entry.includes('попадает') && !entry.includes('КРИТ') ? 'text-green-300' : ''}
                ${entry.includes('двигается') ? 'text-blue-300' : ''}
                ${entry.includes('---') ? 'text-gray-600 border-t border-gray-700 pt-1' : ''}
              `}
            >
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CombatLog;
