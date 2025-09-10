'use client';

import React, { useEffect, useState } from 'react';

const FORMATIONS = [
  { label: '3-5-2', value: [3, 5, 2] },
  { label: '3-4-3', value: [3, 4, 3] },
  { label: '4-4-2', value: [4, 4, 2] },
  { label: '4-5-1', value: [4, 5, 1] },
  { label: '5-3-2', value: [5, 3, 2] },
  { label: '5-4-1', value: [5, 4, 1] },
];

const ELEMENT_TYPE_MAP = {
  Goalkeeper: 'GK',
  Defenders: 'DEF',
  Midfielders: 'MID',
  Forwards: 'FWD',
};

export default function TeamGrid() {
  const [formation, setFormation] = useState([4, 4, 2]);
  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);

  // Load players.json on mount
  useEffect(() => {
    fetch('/cleaned_players.json')
      .then(res => res.json())
      .then(setPlayers);
  }, []);

  const positions = {
    Goalkeeper: 1,
    Defenders: formation[0],
    Midfielders: formation[1],
    Forwards: formation[2],
    Bench: 4,
  };

  // When clicking +Add, open modal for the correct position
  const handleAddClick = (position: string) => {
    setModalPosition(position);
    setShowModal(true);
  };

  // Filter player list by element_type for the modal
  const filteredPlayers = modalPosition
    ? players.filter(
        (player) =>
          player.element_type ===
          ELEMENT_TYPE_MAP[modalPosition as keyof typeof ELEMENT_TYPE_MAP]
      )
    : [];

  return (
    <div className="py-12 px-4 flex justify-center">
      <div className="max-w-5xl w-full mx-auto space-y-10 rounded-2xl bg-[url('/pitch.png')] bg-cover bg-center shadow-lg p-8">
        {/* Formation Selector */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <label className="text-white font-semibold text-base">Formation:</label>
          <select
            className="px-3 py-2 rounded bg-white/90 text-gray-800 font-semibold shadow focus:outline-none"
            value={formation.join('-')}
            onChange={e => {
              const val = e.target.value.split('-').map(Number);
              setFormation(val as [number, number, number]);
            }}
          >
            {FORMATIONS.map(f => (
              <option key={f.label} value={f.value.join('-')}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Player Grid */}
        {Object.entries(positions).map(([pos, count]) => (
          <div key={pos}>
            <h3 className="text-center text-white text-lg font-semibold mb-3 drop-shadow">{pos}</h3>
            <div className="flex justify-center gap-12 flex-wrap">
              {Array.from({ length: count }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-20 h-24 bg-white/10 border border-white rounded-lg flex items-center justify-center text-white text-sm hover:bg-white/20 transition cursor-pointer"
                  onClick={() => handleAddClick(pos)}
                >
                  + Add
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 max-h-[80vh] w-[90vw] max-w-xl overflow-y-auto shadow-lg relative">
              <button
                className="absolute top-2 right-3 text-gray-500 text-2xl font-bold"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
              <h2 className="text-lg font-semibold mb-4">
                Select {modalPosition}
              </h2>
              <ul className="space-y-2">
                {filteredPlayers.length === 0 && <li>No players found.</li>}
                {filteredPlayers.map(player => (
                  <li
                    key={player.id || player.code || `${player.first_name}-${player.second_name}`}
                    className="p-2 rounded hover:bg-blue-100 cursor-pointer transition"
                  >
                    {player.first_name} {player.second_name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
