import React, { useState } from 'react';
import { Calculator, Plus, Trash2, X, Upload, Scissors, Package, Euro } from 'lucide-react';

const RiserOptimizationApp = () => {
  const [projectData, setProjectData] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Large planks configuration
  const [largePlanks, setLargePlanks] = useState([
    { id: 1, width: 900, height: 400, price: 7.92, maxQuantity: null, name: '90x40cm' },
    { id: 2, width: 1360, height: 400, price: 11.74, maxQuantity: null, name: '136x40cm' },
    { id: 3, width: 1810, height: 400, price: 17.73, maxQuantity: null, name: '181x40cm' }
  ]);

  // Saw thickness
  const [sawThickness, setSawThickness] = useState(10);

  // Extract risers from project data
  const risers = projectData?.stairs?.steps?.map(step => ({
    id: step.stepNumber,
    width: step.riserWidth,
    height: step.height,
    name: `Contremarche ${step.stepNumber}`,
    comment: step.comment
  })) || [];

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.type === 'stair-measurement') {
            setProjectData(data);
            setShowUploadModal(false);
          } else {
            alert('Fichier invalide. Veuillez utiliser un fichier exporté depuis l\'étape 1.');
          }
        } catch (error) {
          alert('Erreur lors de la lecture du fichier JSON.');
        }
      };
      reader.readAsText(file);
    }
  };



  // Add new plank
  const addNewPlank = () => {
    const newId = Math.max(...largePlanks.map(p => p.id), 0) + 1;
    setLargePlanks(prev => [...prev, {
      id: newId,
      width: 1000,
      height: 400,
      price: 10.00,
      maxQuantity: null,
      name: '100x40cm'
    }]);
  };

  // Delete plank
  const deletePlank = (id) => {
    setLargePlanks(prev => prev.filter(p => p.id !== id));
  };

  // Generate plank name
  const generatePlankName = (width, height) => {
    return `${Math.round(width/10)}x${Math.round(height/10)}cm`;
  };

  // Optimization algorithm
  const optimizeCutting = () => {
    if (risers.length === 0) {
      alert('Aucune contremarche à optimiser !');
      return;
    }

    setIsCalculating(true);

    // Simulate calculation time
    setTimeout(() => {
      const solution = calculateOptimalCutting(risers, sawThickness);
      setOptimizationResults(solution);
      setIsCalculating(false);
    }, 1500);
  };

  // Calculate optimal cutting arrangement
  const calculateOptimalCutting = (pieces, sawThickness) => {
    const solution = [];
    let remainingPieces = pieces.map((piece, index) => ({
      ...piece,
      instanceId: `piece-${piece.id}`,
      name: `${piece.id}`,
      originalIndex: index
    }));
    
    const plankUsage = {};
    largePlanks.forEach(plank => {
      plankUsage[plank.id] = 0;
    });

    let totalCost = 0;
    let totalPlanks = 0;

    while (remainingPieces.length > 0) {
      let bestOption = null;
      let bestEfficiency = 0;
      
      // Test each plank type
      for (const plankType of largePlanks) {
        if (plankType.maxQuantity && plankUsage[plankType.id] >= plankType.maxQuantity) {
          continue;
        }
        
        const arrangement = calculateBestArrangement(remainingPieces, plankType, sawThickness);
        const costPerArea = plankType.price / (plankType.width * plankType.height);
        const efficiency = arrangement.efficiency / costPerArea;
        
        if (efficiency > bestEfficiency && arrangement.pieces.length > 0) {
          bestEfficiency = efficiency;
          bestOption = {
            plankType,
            arrangement,
            costPerArea
          };
        }
      }
      
      if (bestOption) {
        solution.push(bestOption);
        plankUsage[bestOption.plankType.id]++;
        totalCost += bestOption.plankType.price;
        totalPlanks++;
        
        // Remove used pieces
        remainingPieces = remainingPieces.filter(piece => 
          !bestOption.arrangement.pieces.some(used => used.instanceId === piece.instanceId)
        );
      } else {
        // If no piece can be placed, try with available planks
        const piece = remainingPieces[0];
        const availablePlanks = largePlanks.filter(plank => 
          !plank.maxQuantity || plankUsage[plank.id] < plank.maxQuantity
        );
        
        const suitablePlank = availablePlanks.find(plank => {
          const fitNormal = piece.width <= plank.width && piece.height <= plank.height;
          const fitRotated = piece.height <= plank.width && piece.width <= plank.height;
          return fitNormal || fitRotated;
        });
        
        if (suitablePlank) {
          const rotated = !(piece.width <= suitablePlank.width && piece.height <= suitablePlank.height);
          solution.push({
            plankType: suitablePlank,
            arrangement: { 
              pieces: [{
                ...piece,
                rotated,
                x: 0,
                y: 0,
                displayWidth: rotated ? piece.height : piece.width,
                displayHeight: rotated ? piece.width : piece.height
              }],
              efficiency: (piece.width * piece.height) / (suitablePlank.width * suitablePlank.height)
            }
          });
          plankUsage[suitablePlank.id]++;
          totalCost += suitablePlank.price;
          totalPlanks++;
          remainingPieces.shift();
        } else {
          break;
        }
      }
    }

    return {
      solution,
      totalCost,
      totalPlanks,
      remainingPieces,
      efficiency: solution.reduce((sum, item) => sum + item.arrangement.efficiency, 0) / solution.length
    };
  };

  // Calculate best arrangement for a plank
  const calculateBestArrangement = (pieces, plankType, sawThickness) => {
    const arrangements = [];
    
    // Try different piece combinations
    for (let i = 1; i <= Math.min(pieces.length, 10); i++) {
      const combinations = getCombinations(pieces, i);
      
      for (const combination of combinations) {
        const arrangement = placePieces(combination, plankType, sawThickness);
        if (arrangement.pieces.length > 0) {
          const totalArea = arrangement.pieces.reduce((sum, piece) => 
            sum + (piece.width * piece.height), 0
          );
          arrangement.totalValue = totalArea;
          arrangement.efficiency = totalArea / (plankType.width * plankType.height);
          arrangements.push(arrangement);
        }
      }
    }
    
    return arrangements.reduce((best, current) => 
      current.totalValue > best.totalValue ? current : best
    , { pieces: [], totalValue: 0, efficiency: 0 });
  };

  // Get combinations of pieces
  const getCombinations = (pieces, size) => {
    if (size === 1) return pieces.map(p => [p]);
    if (size === pieces.length) return [pieces];
    
    const combinations = [];
    for (let i = 0; i <= pieces.length - size; i++) {
      const head = pieces[i];
      const tailCombinations = getCombinations(pieces.slice(i + 1), size - 1);
      for (const tail of tailCombinations) {
        combinations.push([head, ...tail]);
      }
    }
    return combinations;
  };

  // Place pieces on a plank
  const placePieces = (pieces, plankType, sawThickness) => {
    const placedPieces = [];
    
    for (const piece of pieces) {
      const position = findBestPosition(piece, placedPieces, plankType, sawThickness);
      if (position) {
        const rotated = position.rotated;
        placedPieces.push({
          ...piece,
          x: position.x,
          y: position.y,
          rotated,
          displayWidth: rotated ? piece.height : piece.width,
          displayHeight: rotated ? piece.width : piece.height
        });
      }
    }
    
    return { pieces: placedPieces };
  };

  // Find best position for a piece
  const findBestPosition = (piece, placedPieces, plankType, sawThickness) => {
    const positions = [];
    
    // Try normal orientation
    if (piece.width <= plankType.width && piece.height <= plankType.height) {
      positions.push({ x: 0, y: 0, rotated: false });
    }
    
    // Try rotated orientation
    if (piece.height <= plankType.width && piece.width <= plankType.height) {
      positions.push({ x: 0, y: 0, rotated: true });
    }
    
    // Add positions near existing pieces
    for (const existing of placedPieces) {
      const rightPos = { x: existing.x + existing.displayWidth + sawThickness, y: existing.y, rotated: false };
      const bottomPos = { x: existing.x, y: existing.y + existing.displayHeight + sawThickness, rotated: false };
      positions.push(rightPos, bottomPos);
    }
    
    // Sort positions by x then y
    positions.sort((a, b) => a.x - b.x || a.y - b.y);
    
    // Test each position
    for (const pos of positions) {
      if (canPlaceAt(piece, pos, placedPieces, plankType, sawThickness)) {
        return pos;
      }
    }
    
    return null;
  };

  // Check if piece can be placed at position
  const canPlaceAt = (piece, position, placedPieces, plankType, sawThickness) => {
    const width = position.rotated ? piece.height : piece.width;
    const height = position.rotated ? piece.width : piece.height;
    
    // Check plank boundaries
    if (position.x + width > plankType.width || position.y + height > plankType.height) {
      return false;
    }
    
    // Check collisions with existing pieces
    for (const existing of placedPieces) {
      if (!(position.x >= existing.x + existing.displayWidth + sawThickness ||
            position.x + width + sawThickness <= existing.x ||
            position.y >= existing.y + existing.displayHeight + sawThickness ||
            position.y + height + sawThickness <= existing.y)) {
        return false;
      }
    }
    
    return true;
  };

  // Generate plank summary
  const generatePlankSummary = (solution) => {
    const summary = {};
    solution.solution.forEach(item => {
      const plankName = generatePlankName(item.plankType.width, item.plankType.height);
      if (!summary[plankName]) {
        summary[plankName] = { 
          count: 0, 
          price: item.plankType.price, 
          dimensions: `${item.plankType.width}×${item.plankType.height}mm` 
        };
      }
      summary[plankName].count++;
    });

    return Object.entries(summary).map(([name, data]) => (
      <div key={name} className="flex justify-between items-center p-2 bg-white rounded border">
        <div>
          <span className="font-medium">{name}</span>
          <span className="text-sm text-gray-600 ml-2">({data.dimensions})</span>
        </div>
        <div className="text-right">
          <div className="font-semibold text-blue-600">
            {data.count} planche{data.count > 1 ? 's' : ''}
          </div>
          <div className="text-sm text-gray-600">
            {data.count} × {data.price}€ = {(data.count * data.price).toFixed(2)}€
          </div>
        </div>
      </div>
    ));
  };

  // Generate plank visualization
  const generatePlankVisualization = (item, index) => {
    const plankType = item.plankType;
    const arrangement = item.arrangement;
    
    // Calculate scale to maintain real proportions
    const maxDisplayWidth = 400;
    const maxDisplayHeight = 200;
    const scaleX = maxDisplayWidth / plankType.width;
    const scaleY = maxDisplayHeight / plankType.height;
    const scale = Math.min(scaleX, scaleY);
    
    const displayWidth = plankType.width * scale;
    const displayHeight = plankType.height * scale;
    
    const colors = ['bg-blue-300', 'bg-green-300', 'bg-red-300', 'bg-purple-300', 'bg-yellow-300', 'bg-pink-300', 'bg-indigo-300', 'bg-orange-300'];
    
    return (
      <div key={index} className="border border-gray-300 p-4 bg-amber-50">
        <h4 className="font-semibold mb-2">{generatePlankName(plankType.width, plankType.height)} - {plankType.price}€</h4>
        <div className="flex justify-center">
          <div 
            className="relative border-2 border-amber-800 bg-amber-100" 
            style={{ width: displayWidth, height: displayHeight }}
          >
            {arrangement.pieces.map((piece, pieceIndex) => {
              const color = colors[piece.originalIndex % colors.length];
              return (
                <div 
                  key={pieceIndex}
                  className={`absolute border border-gray-700 ${color} flex items-center justify-center text-xs font-bold shadow-sm`}
                  style={{
                    width: piece.displayWidth * scale,
                    height: piece.displayHeight * scale,
                    left: piece.x * scale,
                    top: piece.y * scale
                  }}
                >
                  <div className="text-center leading-tight">
                    <div className="font-bold">{piece.name}</div>
                    <div className="text-xs">{piece.width}×{piece.height}</div>
                    {piece.rotated && <div className="text-xs">↻</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600 text-center">
          Pièces: {arrangement.pieces.length} | 
          Efficacité: {(arrangement.efficiency * 100).toFixed(1)}%
        </div>
        <div className="mt-1 text-xs text-gray-500 text-center">
          Dimensions: {plankType.width}×{plankType.height}mm | Échelle: 1:{Math.round(1/scale)}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Scissors className="text-blue-600" />
          Optimisation des Contremarches
        </h1>
        <p className="text-gray-600">
          Étape 2/3 : Optimisez la découpe des contremarches sur les grandes planches
        </p>
      </div>

      {/* File Upload Section */}
      {!projectData && (
        <div className="bg-blue-50 p-6 rounded-lg mb-6 text-center">
          <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importer les mesures de l'étape 1
          </h3>
          <p className="text-gray-600 mb-4">
            Uploadez le fichier JSON exporté depuis l'étape 1 pour commencer l'optimisation
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <Upload className="w-5 h-5" />
            Choisir un fichier JSON
          </button>
        </div>
      )}

      {/* Project Info */}
      {projectData && (
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Projet : {projectData.project.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{risers.length}</div>
              <div className="text-sm text-gray-600">Contremarches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {(risers.reduce((sum, r) => sum + (r.width * r.height), 0) / 1000000).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">m² total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...risers.map(r => r.width))}
              </div>
              <div className="text-sm text-gray-600">Largeur max (mm)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...risers.map(r => r.height))}
              </div>
              <div className="text-sm text-gray-600">Hauteur max (mm)</div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      {projectData && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* General Parameters */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Paramètres généraux</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Largeur de scie (mm)
                </label>
                <input
                  type="number"
                  value={sawThickness}
                  onChange={(e) => setSawThickness(parseInt(e.target.value) || 10)}
                  min="0"
                  max="50"
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Large Planks */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Grandes planches disponibles
              </h3>
              <button
                onClick={addNewPlank}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>
            
            <div className="space-y-2">
              {largePlanks.map((plank) => (
                <div key={plank.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <div className="font-medium">{generatePlankName(plank.width, plank.height)}</div>
                    <div className="text-sm text-gray-600">
                      {plank.width}×{plank.height}mm - {plank.price}€
                      {plank.maxQuantity ? ` (max: ${plank.maxQuantity})` : ''}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => deletePlank(plank.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calculate Button */}
      {projectData && (
        <div className="text-center mb-6">
          <button
            onClick={optimizeCutting}
            disabled={isCalculating || risers.length === 0}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto text-lg font-semibold"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Calcul en cours...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                Calculer l'optimisation
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {optimizationResults && (
        <div className="space-y-6">
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Résultat de l'optimisation
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {optimizationResults.totalCost.toFixed(2)}€
                </div>
                <div className="text-sm text-gray-600">Coût total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {optimizationResults.totalPlanks}
                </div>
                <div className="text-sm text-gray-600">Grandes planches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {risers.length - optimizationResults.remainingPieces.length}
                </div>
                <div className="text-sm text-gray-600">Contremarches placées</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Récapitulatif des planches à commander
            </h3>
            <div className="space-y-2">
              {generatePlankSummary(optimizationResults)}
              <div className="border-t pt-2 mt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total à commander :</span>
                  <span className="text-blue-600">{optimizationResults.totalCost.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Plan de découpe détaillé</h3>
            <div className="space-y-4">
              {optimizationResults.solution.map((item, index) => generatePlankVisualization(item, index))}
            </div>
          </div>

          {optimizationResults.remainingPieces.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">
                Contremarches non placées ({optimizationResults.remainingPieces.length})
              </h3>
              <div className="text-sm text-red-600">
                {optimizationResults.remainingPieces.map(p => p.name).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">
              Importer les mesures
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fichier JSON de l'étape 1
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📋 Instructions</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>1.</strong> Importez le fichier JSON exporté depuis l'étape 1</p>
          <p><strong>2.</strong> Ajustez les paramètres de scie et les grandes planches disponibles</p>
          <p><strong>3.</strong> Lancez l'optimisation pour obtenir le plan de découpe optimal</p>
          <p><strong>4.</strong> Visualisez les résultats et le coût total</p>
        </div>
        <div className="mt-3 text-xs text-blue-600">
          L'algorithme optimise pour le coût total en tenant compte de l'efficacité de découpe et des prix des planches.
        </div>
      </div>
    </div>
  );
};

export default RiserOptimizationApp;