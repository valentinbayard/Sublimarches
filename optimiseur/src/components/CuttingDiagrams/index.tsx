import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { PlankLayout } from '../../types';

const CuttingDiagrams: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('CuttingDiagrams must be used within AppContext');

  const { state } = context;

  if (!state.currentProject?.optimizationResult) return null;

  const { treadLayouts, riserLayouts } = state.currentProject.optimizationResult;

  const renderLayout = (layout: PlankLayout, index: number) => {
    const scaleFactor = 0.2; // Scale down for display
    const canvasWidth = layout.plankSpec.width * scaleFactor;
    const canvasHeight = layout.plankSpec.length * scaleFactor;

    return (
      <div key={`${layout.plankSpec.id}-${index}`} className="mb-8 border border-gray-300 rounded-lg p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">
            {layout.plankSpec.name || layout.plankSpec.id} - Planche #{index + 1}
          </h3>
          <div className="text-sm text-gray-600">
            <span>Dimensions: {layout.plankSpec.width} × {layout.plankSpec.length} mm</span>
            <span className="ml-4">Efficacité: {layout.efficiency.toFixed(1)}%</span>
            <span className="ml-4">Prix: {layout.plankSpec.pricePerPlank.toFixed(2)} €</span>
          </div>
        </div>

        <div className="relative bg-gray-100 border border-gray-400" style={{ width: canvasWidth, height: canvasHeight }}>
          {layout.placedPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute border-2 border-blue-600 bg-blue-200 flex items-center justify-center text-xs font-semibold"
              style={{
                left: piece.x * scaleFactor,
                top: piece.y * scaleFactor,
                width: piece.width * scaleFactor,
                height: piece.height * scaleFactor,
              }}
              title={`Marche ${piece.stepNumber} - ${piece.width}×${piece.height}mm - Rotation: ${piece.rotation}°`}
            >
              #{piece.stepNumber}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h4 className="font-semibold mb-2">Pièces sur cette planche:</h4>
          <ul className="text-sm space-y-1">
            {layout.placedPieces.map((piece) => (
              <li key={piece.id} className="flex items-center gap-2">
                <span className="font-semibold">Marche {piece.stepNumber}:</span>
                <span>{piece.width} × {piece.height} mm</span>
                {piece.rotation !== 0 && <span className="text-blue-600">(Rotation: {piece.rotation}°)</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-6">Plans de Découpe</h2>

      {/* Tread Layouts */}
      {treadLayouts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Marches (Treads)</h3>
          {treadLayouts.map((layout, index) => renderLayout(layout, index))}
        </div>
      )}

      {/* Riser Layouts */}
      {riserLayouts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Contremarches (Risers)</h3>
          {riserLayouts.map((layout, index) => renderLayout(layout, index))}
        </div>
      )}
    </div>
  );
};

export default CuttingDiagrams;
