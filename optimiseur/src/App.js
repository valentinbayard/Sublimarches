import React, { useState } from 'react';
import { Calculator, Scissors, Euro, Package, Edit2, Plus, Trash2, Save, X } from 'lucide-react';

const WoodCuttingOptimizer = () => {
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [editingPlank, setEditingPlank] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [sawThickness, setSawThickness] = useState(10); // 1cm = 10mm - maintenant configurable

  // Données des grandes planches (en mm) - maintenant modifiables
  const [largePlanks, setLargePlanks] = useState([
    { id: 1, width: 900, height: 400, price: 7.92, maxQuantity: null },
    { id: 2, width: 1360, height: 400, price: 11.74, maxQuantity: null },
    { id: 3, width: 1810, height: 400, price: 17.73, maxQuantity: null }
  ]);

  // Pièces à découper - maintenant sans quantité, chaque pièce est unique
  const [pieces, setPieces] = useState([
    { id: 1, width: 700, height: 200 },
    { id: 2, width: 720, height: 200 },
    { id: 3, width: 710, height: 200 },
    { id: 4, width: 700, height: 200 },
    { id: 5, width: 720, height: 200 },
    { id: 6, width: 710, height: 200 },
    { id: 7, width: 700, height: 200 },
    { id: 8, width: 1130, height: 200 },
    { id: 9, width: 840, height: 200 },
    { id: 10, width: 1150, height: 200 },
    { id: 11, width: 690, height: 200 },
    { id: 12, width: 800, height: 200 },
    { id: 13, width: 780, height: 200 },
    { id: 14, width: 640, height: 200 },
    { id: 15, width: '', height: '' } // Ligne vide pour nouvelle pièce
  ]);

  // Générer automatiquement le nom des planches
  const generatePlankName = (width, height) => {
    return `${Math.round(width/10)}x${Math.round(height/10)}cm`;
  };

  // Créer la liste complète des pièces (maintenant sans quantité)
  const createPiecesList = (piecesToCut) => {
    return piecesToCut
      .filter(piece => piece.width && piece.height) // Filtrer les pièces vides
      .map((piece, index) => ({
        ...piece,
        instanceId: `piece-${piece.id}`,
        name: `${index + 1}`, // Utiliser l'index + 1 pour la numérotation continue
        originalIndex: index
      }));
  };

  // Fonctions pour gérer les pièces
  const updatePiece = (id, field, value) => {
    setPieces(prev => {
      const updatedPieces = prev.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      );
      
      // Si on vient de remplir une pièce qui était vide, créer une nouvelle ligne vide
      const updatedPiece = updatedPieces.find(p => p.id === id);
      const isLastPiece = id === Math.max(...updatedPieces.map(p => p.id));
      
      if (isLastPiece && updatedPiece.width && updatedPiece.height) {
        const newId = Math.max(...updatedPieces.map(p => p.id)) + 1;
        updatedPieces.push({ id: newId, width: '', height: '' });
      }
      
      return updatedPieces;
    });
  };

  const deletePiece = (id) => {
    setPieces(prev => prev.filter(p => p.id !== id));
  };

  // Fonction pour copier la pièce précédente
  const copyPreviousPiece = (currentId) => {
    const currentIndex = pieces.findIndex(p => p.id === currentId);
    if (currentIndex > 0) {
      const previousPiece = pieces[currentIndex - 1];
      updatePiece(currentId, 'width', previousPiece.width);
      updatePiece(currentId, 'height', previousPiece.height);
    }
  };

  // Fonction pour obtenir le numéro d'affichage d'une pièce (numérotation continue)
  const getPieceDisplayNumber = (pieceId) => {
    const validPieces = pieces.filter(p => p.width && p.height);
    const pieceIndex = validPieces.findIndex(p => p.id === pieceId);
    return pieceIndex >= 0 ? pieceIndex + 1 : 'Nouveau';
  };

  // Fonction pour supprimer toutes les pièces
  const deleteAllPieces = () => {
    setPieces([{ id: 1, width: '', height: '' }]);
    setResults(null); // Effacer les résultats
    setShowDeleteAllModal(false);
  };

  // Fonction pour gérer le focus sur la pièce suivante
  const handleHeightKeyDown = (e, currentId) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const nextId = currentId + 1;
      const nextWidthInput = document.getElementById(`width-${nextId}`);
      if (nextWidthInput) {
        nextWidthInput.focus();
      }
    }
  };

  // Calculer le meilleur arrangement pour une planche
  const calculateBestArrangement = (pieces, plankType) => {
    const arrangements = [];
    
    // Fonction récursive pour placer les pièces
    const placePieces = (remainingPieces, placedPieces = []) => {
      if (placedPieces.length > 0) {
        const totalValue = placedPieces.reduce((sum, p) => sum + (p.width * p.height), 0);
        arrangements.push({
          pieces: [...placedPieces],
          totalValue,
          efficiency: totalValue / (plankType.width * plankType.height)
        });
      }

      // Essayer d'ajouter chaque pièce restante
      for (let i = 0; i < remainingPieces.length; i++) {
        const piece = remainingPieces[i];
        
        // Essayer les deux orientations
        const orientations = [
          { width: piece.width, height: piece.height, rotated: false },
          { width: piece.height, height: piece.width, rotated: true }
        ];
        
        for (const orientation of orientations) {
          const position = findBestPosition(orientation, placedPieces, plankType);
          if (position) {
            const newPiece = {
              ...piece,
              rotated: orientation.rotated,
              x: position.x,
              y: position.y,
              displayWidth: orientation.width,
              displayHeight: orientation.height
            };
            
            placePieces(
              remainingPieces.filter((_, idx) => idx !== i),
              [...placedPieces, newPiece]
            );
          }
        }
      }
    };

    // Trouver la meilleure position pour une pièce
    const findBestPosition = (piece, placedPieces, plankType) => {
      // Essayer de placer en (0,0) si c'est la première pièce
      if (placedPieces.length === 0) {
        if (piece.width <= plankType.width && piece.height <= plankType.height) {
          return { x: 0, y: 0 };
        }
        return null;
      }

      // Générer les positions possibles
      const positions = [];
      
      // Positions à droite des pièces existantes
      placedPieces.forEach(existing => {
        positions.push({
          x: existing.x + existing.displayWidth + sawThickness,
          y: existing.y
        });
      });
      
      // Positions en dessous des pièces existantes
      placedPieces.forEach(existing => {
        positions.push({
          x: existing.x,
          y: existing.y + existing.displayHeight + sawThickness
        });
      });

      // Trier les positions par x puis par y (placement de gauche à droite, haut en bas)
      positions.sort((a, b) => a.x - b.x || a.y - b.y);

      // Tester chaque position
      for (const pos of positions) {
        if (canPlaceAt(piece, pos, placedPieces, plankType)) {
          return pos;
        }
      }
      
      return null;
    };

    // Vérifier si une pièce peut être placée à une position donnée
    const canPlaceAt = (piece, position, placedPieces, plankType) => {
      // Vérifier les limites de la planche
      if (position.x + piece.width > plankType.width || 
          position.y + piece.height > plankType.height) {
        return false;
      }

      // Vérifier les collisions avec les pièces existantes
      for (const existing of placedPieces) {
        if (!(position.x >= existing.x + existing.displayWidth + sawThickness ||
              position.x + piece.width + sawThickness <= existing.x ||
              position.y >= existing.y + existing.displayHeight + sawThickness ||
              position.y + piece.height + sawThickness <= existing.y)) {
          return false;
        }
      }
      
      return true;
    };

    placePieces(pieces);
    
    // Retourner le meilleur arrangement
    return arrangements.reduce((best, current) => 
      current.totalValue > best.totalValue ? current : best
    , { pieces: [], totalValue: 0, efficiency: 0 });
  };

  // Optimiser la découpe
  const optimizeCutting = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const allPieces = createPiecesList(pieces);
      const solution = [];
      let remainingPieces = [...allPieces];
      const plankUsage = {}; // Compteur d'utilisation par type de planche
      
      // Initialiser les compteurs
      largePlanks.forEach(plank => {
        plankUsage[plank.id] = 0;
      });
      
      while (remainingPieces.length > 0) {
        let bestOption = null;
        let bestEfficiency = 0;
        
        // Tester chaque type de grande planche
        for (const plankType of largePlanks) {
          // Vérifier si on peut encore utiliser ce type de planche
          if (plankType.maxQuantity && plankUsage[plankType.id] >= plankType.maxQuantity) {
            continue;
          }
          
          const arrangement = calculateBestArrangement(remainingPieces, plankType);
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
          // Retirer les pièces utilisées
          remainingPieces = remainingPieces.filter(piece => 
            !bestOption.arrangement.pieces.some(used => used.instanceId === piece.instanceId)
          );
        } else {
          // Si aucune pièce ne peut être placée, essayer avec les planches disponibles
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
                totalValue: piece.width * piece.height,
                efficiency: (piece.width * piece.height) / (suitablePlank.width * suitablePlank.height)
              },
              costPerArea: suitablePlank.price / (suitablePlank.width * suitablePlank.height)
            });
            plankUsage[suitablePlank.id]++;
            remainingPieces = remainingPieces.filter(p => p.instanceId !== piece.instanceId);
          } else {
            break; // Impossible de placer cette pièce
          }
        }
      }
      
      setResults({
        solution,
        totalCost: solution.reduce((sum, s) => sum + s.plankType.price, 0),
        totalPlanks: solution.length,
        remainingPieces,
        plankUsage
      });
      
      setIsCalculating(false);
    }, 100);
  };

  // Édition des planches
  const editPlank = (plank) => {
    setEditingPlank({...plank});
  };

  const savePlank = () => {
    const plankWithName = {
      ...editingPlank,
      name: generatePlankName(editingPlank.width, editingPlank.height)
    };
    
    if (editingPlank.id) {
      // Modification d'une planche existante
      setLargePlanks(prev => prev.map(p => 
        p.id === editingPlank.id ? plankWithName : p
      ));
    } else {
      // Nouvelle planche
      const newId = Math.max(...largePlanks.map(p => p.id), 0) + 1;
      setLargePlanks(prev => [...prev, { ...plankWithName, id: newId }]);
    }
    setEditingPlank(null);
  };

  const deletePlank = (id) => {
    setLargePlanks(prev => prev.filter(p => p.id !== id));
  };

  const addNewPlank = () => {
    setEditingPlank({
      id: null,
      width: 1000,
      height: 400,
      price: 10.00,
      maxQuantity: null
    });
  };

  const PlankVisualization = ({ plankType, arrangement }) => {
    // Calculer l'échelle pour maintenir les proportions réelles
    const maxDisplayWidth = 400;
    const maxDisplayHeight = 200;
    const scaleX = maxDisplayWidth / plankType.width;
    const scaleY = maxDisplayHeight / plankType.height;
    const scale = Math.min(scaleX, scaleY);
    
    const displayWidth = plankType.width * scale;
    const displayHeight = plankType.height * scale;
    
    return (
      <div className="border border-gray-300 p-4 bg-amber-50">
        <h4 className="font-semibold mb-2">{generatePlankName(plankType.width, plankType.height)} - {plankType.price}€</h4>
        <div className="flex justify-center">
          <div 
            className="relative border-2 border-amber-800 bg-amber-100"
            style={{
              width: displayWidth,
              height: displayHeight
            }}
          >
            {arrangement.pieces.map((piece, index) => {
              const colors = ['bg-blue-300', 'bg-green-300', 'bg-red-300', 'bg-purple-300', 'bg-yellow-300', 'bg-pink-300', 'bg-indigo-300', 'bg-orange-300'];
              const color = colors[piece.originalIndex % colors.length];
              
              return (
                <div
                  key={piece.instanceId}
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
          Optimiseur de Découpe de Planches
        </h1>
        <p className="text-gray-600">
          Outil interactif pour optimiser le coût total des grandes planches
        </p>
      </div>

      {/* Configuration */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Paramètres généraux */}
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
                onChange={(e) => setSawThickness(parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 rounded-md"
                min="0"
                max="50"
              />
            </div>
          </div>
        </div>

        {/* Grandes planches */}
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
                    {plank.maxQuantity && <span className="ml-1">(max: {plank.maxQuantity})</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => editPlank(plank)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
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

      {/* Pièces à découper */}
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Pièces à découper
          </h3>
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
            disabled={pieces.filter(p => p.width && p.height).length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Tout supprimer
          </button>
        </div>
        
        <div className="grid gap-2">
          {pieces.map((piece, index) => {
            const isLastPiece = index === pieces.length - 1;
            const isEmpty = !piece.width && !piece.height;
            const displayNumber = getPieceDisplayNumber(piece.id);
            const previousPiece = index > 0 ? pieces[index - 1] : null;
            const canCopyPrevious = isLastPiece && isEmpty && previousPiece && previousPiece.width && previousPiece.height;
            
            return (
              <div key={piece.id} className="flex items-center gap-3 p-2 bg-white rounded border">
                <div className="font-medium text-green-800 w-12 text-sm">
                  {displayNumber}
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Largeur:</label>
                  <input
                    id={`width-${piece.id}`}
                    type="number"
                    value={piece.width}
                    onChange={(e) => updatePiece(piece.id, 'width', parseInt(e.target.value) || '')}
                    className="w-20 p-1 border border-gray-300 rounded text-sm"
                    min="1"
                    placeholder="mm"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Hauteur:</label>
                  <input
                    id={`height-${piece.id}`}
                    type="number"
                    value={piece.height}
                    onChange={(e) => updatePiece(piece.id, 'height', parseInt(e.target.value) || '')}
                    onKeyDown={(e) => handleHeightKeyDown(e, piece.id)}
                    className="w-20 p-1 border border-gray-300 rounded text-sm"
                    min="1"
                    placeholder="mm"
                  />
                </div>
                
                <div className="flex items-center gap-1">
                  {canCopyPrevious && (
                    <button
                      onClick={() => copyPreviousPiece(piece.id)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                      title={`Copier la pièce précédente (${previousPiece.width}×${previousPiece.height})`}
                    >
                      Copier
                    </button>
                  )}
                  
                  {!isLastPiece && (
                    <button
                      onClick={() => deletePiece(piece.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-3 text-xs text-green-700">
          Tapez Tab après la hauteur pour passer à la pièce suivante. Utilisez "Copier" pour reprendre les dimensions de la pièce précédente.
        </div>
      </div>

      {/* Bouton de calcul */}
      <div className="text-center mb-6">
        <button
          onClick={optimizeCutting}
          disabled={isCalculating}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto text-lg font-semibold"
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

      {/* Modal de suppression de toutes les pièces */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-800">
              Supprimer toutes les pièces
            </h3>
            
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer toutes les pièces à découper ? 
              Cette action est irréversible et effacera également les résultats de calcul.
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={deleteAllPieces}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition */}
      {editingPlank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingPlank.id ? 'Modifier la planche' : 'Nouvelle planche'}
            </h3>
            
            <div className="space-y-4">            
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Largeur (mm)</label>
                  <input
                    type="number"
                    value={editingPlank.width}
                    onChange={(e) => setEditingPlank({...editingPlank, width: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hauteur (mm)</label>
                  <input
                    type="number"
                    value={editingPlank.height}
                    onChange={(e) => setEditingPlank({...editingPlank, height: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                Nom généré automatiquement : <strong>{generatePlankName(editingPlank.width, editingPlank.height)}</strong>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPlank.price}
                    onChange={(e) => setEditingPlank({...editingPlank, price: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité max</label>
                  <input
                    type="number"
                    value={editingPlank.maxQuantity || ''}
                    onChange={(e) => setEditingPlank({...editingPlank, maxQuantity: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Illimité"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingPlank(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={savePlank}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Résultats */}
      {results && (
        <div className="space-y-6">
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Résultat de l'optimisation
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.totalCost.toFixed(2)}€
                </div>
                <div className="text-sm text-gray-600">Coût total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.totalPlanks}
                </div>
                <div className="text-sm text-gray-600">Grandes planches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {pieces.filter(p => p.width && p.height).length - results.remainingPieces.length}
                </div>
                <div className="text-sm text-gray-600">Pièces placées</div>
              </div>
            </div>
          </div>

          {/* Récapitulatif des planches à commander */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Récapitulatif des planches à commander
            </h3>
            <div className="space-y-2">
              {largePlanks.map(plank => {
                const count = results.solution.filter(s => s.plankType.id === plank.id).length;
                if (count > 0) {
                  return (
                    <div key={plank.id} className="flex justify-between items-center p-2 bg-white rounded border">
                      <div>
                        <span className="font-medium">{generatePlankName(plank.width, plank.height)}</span>
                        <span className="text-sm text-gray-600 ml-2">({plank.width}×{plank.height}mm)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600">
                          {count} planche{count > 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-gray-600">
                          {count} × {plank.price}€ = {(count * plank.price).toFixed(2)}€
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
              <div className="border-t pt-2 mt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total à commander :</span>
                  <span className="text-blue-600">{results.totalCost.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Plan de découpe */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Plan de découpe détaillé</h3>
            <div className="space-y-4">
              {results.solution.map((item, index) => (
                <PlankVisualization
                  key={index}
                  plankType={item.plankType}
                  arrangement={item.arrangement}
                />
              ))}
            </div>
          </div>

          {/* Détail de l'utilisation */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Détail de l'utilisation</h3>
            {largePlanks.map(plank => {
              const plankUsages = results.solution.filter(s => s.plankType.id === plank.id);
              if (plankUsages.length > 0) {
                return (
                  <div key={plank.id} className="mb-3">
                    <div className="font-medium text-gray-700 mb-1">
                      {generatePlankName(plank.width, plank.height)} ({plankUsages.length}/{plank.maxQuantity || '∞'}) :
                    </div>
                    {plankUsages.map((usage, index) => (
                      <div key={index} className="ml-4 text-sm text-gray-600">
                        Planche {index + 1}: {usage.arrangement.pieces.length} pièce{usage.arrangement.pieces.length > 1 ? 's' : ''} 
                        ({usage.arrangement.pieces.map(p => p.name).join(', ')}) - 
                        Efficacité: {(usage.arrangement.efficiency * 100).toFixed(1)}%
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </div>

          {results.remainingPieces.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">
                Pièces non placées ({results.remainingPieces.length})
              </h3>
              <div className="text-sm text-red-600">
                {results.remainingPieces.map(piece => piece.name).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WoodCuttingOptimizer;