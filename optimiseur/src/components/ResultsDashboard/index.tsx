import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { formatCurrency, formatPercentage, formatArea } from '../../utils/calculations';
import { Download, Printer } from 'lucide-react';

const ResultsDashboard: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('ResultsDashboard must be used within AppContext');

  const { state } = context;

  if (!state.currentProject?.optimizationResult || !state.currentProject?.shoppingList) {
    return null;
  }

  const currentProject = state.currentProject;
  const optimizationResult = currentProject.optimizationResult!;
  const shoppingList = currentProject.shoppingList!;
  const cuttingInstructions = currentProject.cuttingInstructions;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const data = {
      project: currentProject.name,
      client: currentProject.client.name,
      optimizationResult,
      shoppingList,
      cuttingInstructions,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultat-optimisation-${currentProject.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Résultats de l'Optimisation</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Printer size={20} />
              Imprimer
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              <Download size={20} />
              Télécharger
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 font-medium">Planches Totales</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {optimizationResult.treadLayouts.length + optimizationResult.riserLayouts.length}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {optimizationResult.treadLayouts.length} marches, {optimizationResult.riserLayouts.length} contremarches
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 font-medium">Coût Total</div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {formatCurrency(optimizationResult.totalCost)}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-700 font-medium">Efficacité</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">
              {formatPercentage(optimizationResult.overallEfficiency)}
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-700 font-medium">Déchet</div>
            <div className="text-2xl font-bold text-orange-900 mt-1">
              {formatArea(optimizationResult.totalWaste)}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {!optimizationResult.allPiecesFit && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="font-semibold text-red-800 mb-2">Attention!</h3>
            <p className="text-red-700">
              {optimizationResult.unfitPieces.length} pièce(s) ne rentre(nt) pas dans les planches disponibles.
              Veuillez vérifier l'inventaire ou les mesures.
            </p>
            <ul className="mt-2 list-disc list-inside text-red-700">
              {optimizationResult.unfitPieces.map(piece => (
                <li key={piece.id}>
                  Marche {piece.stepNumber}: {piece.width} × {piece.height} mm
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Shopping List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Liste d'Achat</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Article</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Quantité</th>
              <th className="border border-gray-300 px-4 py-2 text-right">Prix Unitaire</th>
              <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {shoppingList.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">
                  {item.plankSpec.name || item.plankSpec.id}
                  <div className="text-sm text-gray-600">
                    {item.plankSpec.width} × {item.plankSpec.length} mm
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">{item.purpose}</td>
                <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                  {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={4} className="border border-gray-300 px-4 py-2 text-right">
                Total Général:
              </td>
              <td className="border border-gray-300 px-4 py-2 text-right">
                {formatCurrency(shoppingList.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
        <div className="mt-2 text-sm text-gray-600">
          Déchet estimé: {formatPercentage(shoppingList.estimatedWaste)}
        </div>
      </div>

      {/* Cutting Instructions */}
      {cuttingInstructions && cuttingInstructions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions de Découpe</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2">#</th>
                  <th className="border border-gray-300 px-2 py-2">Marche</th>
                  <th className="border border-gray-300 px-2 py-2">Type</th>
                  <th className="border border-gray-300 px-2 py-2">Planche</th>
                  <th className="border border-gray-300 px-2 py-2">Dimensions</th>
                  <th className="border border-gray-300 px-2 py-2">Rotation</th>
                  <th className="border border-gray-300 px-2 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {cuttingInstructions.map((instruction) => (
                  <tr key={instruction.instructionNumber}>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {instruction.instructionNumber}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {instruction.stepNumber}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      {instruction.pieceType === 'tread' ? 'Marche' : 'Contremarche'}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      #{instruction.plankIndex + 1}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      {instruction.width} × {instruction.height} mm
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {instruction.rotation}°
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-xs">
                      {instruction.notes?.join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDashboard;
