import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Trash2, X, Upload, Scissors, Package, Euro, ArrowLeft, Copy } from 'lucide-react';

const TreadOptimizationApp = () => {
  const [projectData, setProjectData] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Large planks configuration
  const [largePlanks, setLargePlanks] = useState([
    { id: 1, width: 900, height: 610, price: 45.98, maxQuantity: null, name: '90x61cm' },
    { id: 2, width: 1210, height: 610, price: 60.13, maxQuantity: null, name: '121x61cm' },
    { id: 3, width: 1360, height: 610, price: 67.20, maxQuantity: null, name: '136x61cm' },
    { id: 4, width: 1810, height: 610, price: 96.69, maxQuantity: null, name: '181x61cm' }
  ]);

  // Saw thickness
  const [sawThickness, setSawThickness] = useState(10);

  // Extract treads from project data
  const treads = projectData?.stairs?.steps?.map(step => ({
    id: step.stepNumber,
    width: Math.max(step.maxWidth, step.maxDepth), // Plus grande longueur
    height: Math.min(step.maxWidth, step.maxDepth), // Plus grande largeur
    name: `Dessus de marche ${step.stepNumber}`,
    comment: step.comment
  })) || [];
  
  // Debug: log treads when projectData changes
  useEffect(() => {
    if (projectData) {
      console.log('ProjectData mis à jour:', projectData);
      console.log('Dessus de marche extraits:', treads);
    }
  }, [projectData, treads]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          console.log('Fichier importé:', data);
          
          // Check if it's a valid stair measurement file
          const isValidType = (data.type === 'stair-measurement' || data.metadata?.type === 'stair-measurement');
          const hasStairs = data.stairs && data.stairs.steps && Array.isArray(data.stairs.steps);
          
          if (isValidType && hasStairs) {
            console.log('Contremarches trouvées:', data.stairs.steps.length);
            setProjectData(data);
            setShowUploadModal(false);
          } else {
            console.error('Structure de fichier invalide:', data);
            alert('Fichier invalide. Veuillez utiliser un fichier exporté depuis l\'étape 1.\n\nStructure attendue: fichier JSON avec type="stair-measurement" et données des marches.');
          }
        } catch (error) {
          console.error('Erreur de parsing JSON:', error);
          alert('Erreur lors de la lecture du fichier JSON: ' + error.message);
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
      height: 610,
      price: 0.00,
      maxQuantity: null,
      name: '100x61cm'
    }]);
  };

  // Delete plank
  const deletePlank = (id) => {
    setLargePlanks(prev => prev.filter(p => p.id !== id));
  };

  // Update plank
  const updatePlank = (id, field, value) => {
    setLargePlanks(prev => prev.map(plank => 
      plank.id === id ? { ...plank, [field]: value } : plank
    ));
  };

  // Generate plank name
  const generatePlankName = (width, height) => {
    return `${Math.round(width/10)}x${Math.round(height/10)}cm`;
  };

  // Optimization algorithm
  const optimizeCutting = () => {
    if (treads.length === 0) {
      alert('Aucun dessus de marche à optimiser !');
      return;
    }

    setIsCalculating(true);

    // Simulate calculation time
    setTimeout(() => {
      const solution = calculateOptimalCutting(treads, sawThickness);
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

  // Generate shopping list as text table
  const generateShoppingListText = (solution) => {
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

    let tableText = "Grande planche\tQuantité\tPU\tPrix total\n";
    tableText += "-\t-\t-\t-\n";
    
    let totalCost = 0;
    Object.entries(summary).forEach(([name, data]) => {
      const lineTotal = data.count * data.price;
      totalCost += lineTotal;
      tableText += `${name}\t${data.count}\t${data.price}€\t${lineTotal.toFixed(2)}€\n`;
    });
    
    tableText += "-\t-\t-\t-\n";
    tableText += `Total\t\t\t${totalCost.toFixed(2)}€\n`;
    
    return tableText;
  };

  // Copy shopping list to clipboard
  const copyShoppingListToClipboard = () => {
    if (!optimizationResults) return;
    
    const tableText = generateShoppingListText(optimizationResults);
    
    navigator.clipboard.writeText(tableText).then(() => {
      // Show a temporary success message
      const button = document.getElementById('copy-shopping-list-btn');
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<Copy className="w-4 h-4" /> Copié !';
        button.className = 'px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1';
        setTimeout(() => {
          button.innerHTML = originalText;
          button.className = 'px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1';
        }, 2000);
      }
    }).catch(err => {
      console.error('Erreur lors de la copie:', err);
      alert('Erreur lors de la copie vers le presse-papiers');
    });
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
        <div className="flex items-center gap-4 mb-2">
          <a 
            href="/Sublimarches/optimiseur/contremarches/" 
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'étape 2
          </a>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Scissors className="text-blue-600" />
          Optimisation des Dessus de Marche
        </h1>
        <p className="text-gray-600">
          Étape 3/3 : Optimisez la découpe des dessus de marche sur les grandes planches {/* Updated */}
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
              <div className="text-2xl font-bold text-green-600">{treads.length}</div>
              <div className="text-sm text-gray-600">Dessus de marche</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {(treads.reduce((sum, t) => sum + (t.width * t.height), 0) / 1000000).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">m² total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...treads.map(t => t.width))}
              </div>
              <div className="text-sm text-gray-600">Longueur max (mm)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...treads.map(t => t.height))}
              </div>
              <div className="text-sm text-gray-600">Largeur max (mm)</div>
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
                <div key={plank.id} className="p-3 bg-white rounded border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Largeur (mm)</label>
                      <input
                        type="number"
                        value={plank.width}
                        onChange={(e) => updatePlank(plank.id, 'width', parseInt(e.target.value) || 0)}
                        className="w-full p-1 text-sm border border-gray-300 rounded"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Hauteur (mm)</label>
                      <input
                        type="number"
                        value={plank.height}
                        onChange={(e) => updatePlank(plank.id, 'height', parseInt(e.target.value) || 0)}
                        className="w-full p-1 text-sm border border-gray-300 rounded"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Prix (€)</label>
                      <input
                        type="number"
                        value={plank.price}
                        onChange={(e) => updatePlank(plank.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full p-1 text-sm border border-gray-300 rounded"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantité max</label>
                      <input
                        type="number"
                        value={plank.maxQuantity || ''}
                        onChange={(e) => updatePlank(plank.id, 'maxQuantity', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full p-1 text-sm border border-gray-300 rounded"
                        min="1"
                        placeholder="Illimité"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {generatePlankName(plank.width, plank.height)} - {plank.price}€
                      {plank.maxQuantity ? ` (max: ${plank.maxQuantity})` : ' (illimité)'}
                    </div>
                    <button
                      onClick={() => deletePlank(plank.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Supprimer cette planche"
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
            disabled={isCalculating || treads.length === 0}
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
                  {treads.length - optimizationResults.remainingPieces.length}
                </div>
                <div className="text-sm text-gray-600">Dessus de marche placés</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Récapitulatif des planches à commander
              </h3>
              <button
                id="copy-shopping-list-btn"
                onClick={copyShoppingListToClipboard}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                title="Copier la liste d'achat au format tableau"
              >
                <Copy className="w-4 h-4" />
                Copier liste
              </button>
            </div>
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
                Dessus de marche non placés ({optimizationResults.remainingPieces.length})
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
          Chaque dessus de marche utilise la plus grande longueur et largeur de la marche.
        </div>
      </div>
    </div>
  );
};

export default TreadOptimizationApp;