import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { PlankSpec, PlankType, DEFAULT_TREAD_THICKNESS, DEFAULT_RISER_THICKNESS, DEFAULT_NOSING_DEPTH } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

const PlankInventory: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('PlankInventory must be used within AppContext');

  const { state, dispatch } = context;
  const [activeType, setActiveType] = useState<'tread' | 'riser'>('tread');

  if (!state.currentProject) return null;

  const treads = state.currentProject.plankInventory.treads;
  const risers = state.currentProject.plankInventory.risers;

  const addPlank = (type: 'tread' | 'riser') => {
    const newPlank: PlankSpec = {
      id: `${type}_${Date.now()}`,
      type: type === 'tread' ? PlankType.TREAD : PlankType.RISER,
      width: type === 'tread' ? 300 : 200,
      length: type === 'tread' ? 1200 : 2000,
      thickness: type === 'tread' ? DEFAULT_TREAD_THICKNESS : DEFAULT_RISER_THICKNESS,
      hasNosing: type === 'tread',
      nosingDepth: type === 'tread' ? DEFAULT_NOSING_DEPTH : undefined,
      pricePerPlank: 0,
      stockQuantity: 10,
      name: `${type === 'tread' ? 'Marche' : 'Contremarche'} ${(type === 'tread' ? treads : risers).length + 1}`,
    };

    const updated = {
      treads: type === 'tread' ? [...treads, newPlank] : treads,
      risers: type === 'riser' ? [...risers, newPlank] : risers,
    };

    dispatch({
      type: 'UPDATE_INVENTORY',
      payload: { inventory: updated },
    });
  };

  const updatePlank = (id: string, type: 'tread' | 'riser', field: keyof PlankSpec, value: any) => {
    const updateList = (planks: PlankSpec[]) =>
      planks.map(p => (p.id === id ? { ...p, [field]: value } : p));

    const updated = {
      treads: type === 'tread' ? updateList(treads) : treads,
      risers: type === 'riser' ? updateList(risers) : risers,
    };

    dispatch({
      type: 'UPDATE_INVENTORY',
      payload: { inventory: updated },
    });
  };

  const deletePlank = (id: string, type: 'tread' | 'riser') => {
    const updated = {
      treads: type === 'tread' ? treads.filter(p => p.id !== id) : treads,
      risers: type === 'riser' ? risers.filter(p => p.id !== id) : risers,
    };

    dispatch({
      type: 'UPDATE_INVENTORY',
      payload: { inventory: updated },
    });
  };

  const renderPlankTable = (planks: PlankSpec[], type: 'tread' | 'riser') => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-sm">Nom</th>
            <th className="border border-gray-300 px-2 py-2 text-sm">Largeur (mm)</th>
            <th className="border border-gray-300 px-2 py-2 text-sm">Longueur (mm)</th>
            <th className="border border-gray-300 px-2 py-2 text-sm">Épaisseur (mm)</th>
            {type === 'tread' && (
              <th className="border border-gray-300 px-2 py-2 text-sm">Nez (mm)</th>
            )}
            <th className="border border-gray-300 px-2 py-2 text-sm">Prix (€)</th>
            <th className="border border-gray-300 px-2 py-2 text-sm">Stock</th>
            <th className="border border-gray-300 px-2 py-2 text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {planks.map((plank) => (
            <tr key={plank.id}>
              <td className="border border-gray-300 px-2 py-2">
                <input
                  type="text"
                  value={plank.name || ''}
                  onChange={(e) => updatePlank(plank.id, type, 'name', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </td>
              <td className="border border-gray-300 px-2 py-2">
                <input
                  type="number"
                  value={plank.width}
                  onChange={(e) => updatePlank(plank.id, type, 'width', Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </td>
              <td className="border border-gray-300 px-2 py-2">
                <input
                  type="number"
                  value={plank.length}
                  onChange={(e) => updatePlank(plank.id, type, 'length', Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </td>
              <td className="border border-gray-300 px-2 py-2">
                <input
                  type="number"
                  value={plank.thickness}
                  onChange={(e) => updatePlank(plank.id, type, 'thickness', Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </td>
              {type === 'tread' && (
                <td className="border border-gray-300 px-2 py-2">
                  <input
                    type="number"
                    value={plank.nosingDepth || DEFAULT_NOSING_DEPTH}
                    onChange={(e) => updatePlank(plank.id, type, 'nosingDepth', Number(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  />
                </td>
              )}
              <td className="border border-gray-300 px-2 py-2">
                <input
                  type="number"
                  value={plank.pricePerPlank}
                  onChange={(e) => updatePlank(plank.id, type, 'pricePerPlank', Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                  step="0.01"
                />
              </td>
              <td className="border border-gray-300 px-2 py-2">
                <input
                  type="number"
                  value={plank.stockQuantity || 0}
                  onChange={(e) => updatePlank(plank.id, type, 'stockQuantity', Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </td>
              <td className="border border-gray-300 px-2 py-2 text-center">
                <button
                  onClick={() => deletePlank(plank.id, type)}
                  className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {planks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucune planche définie. Cliquez sur "Ajouter" pour commencer.
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Inventaire des Planches</h2>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveType('tread')}
            className={`${
              activeType === 'tread'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Marches (avec nez)
          </button>
          <button
            onClick={() => setActiveType('riser')}
            className={`${
              activeType === 'riser'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Contremarches
          </button>
        </nav>
      </div>

      {/* Add Button */}
      <div className="mb-4">
        <button
          onClick={() => addPlank(activeType)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          <Plus size={20} />
          Ajouter une Planche
        </button>
      </div>

      {/* Plank Table */}
      {activeType === 'tread' && renderPlankTable(treads, 'tread')}
      {activeType === 'riser' && renderPlankTable(risers, 'riser')}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">Information Importante</h3>
        <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
          <li>Les marches doivent avoir un nez sur les deux bords longs</li>
          <li>Les marches ne peuvent pivoter que de 0° ou 180°</li>
          <li>Les contremarches peuvent pivoter de 0° ou 90°</li>
          <li>Le nez réduit la profondeur utilisable de la planche</li>
        </ul>
      </div>
    </div>
  );
};

export default PlankInventory;
