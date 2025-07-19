import React, { useState } from 'react';
import { Ruler, Save, Download, Plus, Trash2, Copy, X, AlertCircle, CheckCircle } from 'lucide-react';

const EscalierMesuresApp = () => {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
  // Mesures des marches - initialisation vide
  const [marches, setMarches] = useState([
    { 
      id: 1, 
      largeurMax: '', 
      profondeurMax: '', 
      largeurContremarche: '', 
      hauteur: '', 
      notes: '' 
    } // Ligne vide pour nouvelle marche
  ]);

  // Validation des données
  const validateData = () => {
    const errors = [];
    const warnings = [];
    
    if (!projectName.trim()) {
      errors.push('Le nom du projet est obligatoire');
    }
    
    const validMarches = marches.filter(m => m.largeurMax && m.profondeurMax && m.largeurContremarche && m.hauteur);
    if (validMarches.length === 0) {
      errors.push('Au moins une marche doit être saisie');
    }
    
    // Vérifications sur les dimensions
    validMarches.forEach((marche, index) => {
      if (marche.largeurMax < 100 || marche.largeurMax > 3000) {
        warnings.push(`Marche ${index + 1}: largeur max inhabituelle (${marche.largeurMax}mm)`);
      }
      if (marche.profondeurMax < 150 || marche.profondeurMax > 500) {
        warnings.push(`Marche ${index + 1}: profondeur max inhabituelle (${marche.profondeurMax}mm)`);
      }
      if (marche.largeurContremarche < 100 || marche.largeurContremarche > 3000) {
        warnings.push(`Marche ${index + 1}: largeur contremarche inhabituelle (${marche.largeurContremarche}mm)`);
      }
      if (marche.hauteur < 50 || marche.hauteur > 250) {
        warnings.push(`Marche ${index + 1}: hauteur inhabituelle (${marche.hauteur}mm)`);
      }
    });
    
    return { errors, warnings };
  };

  // Fonctions pour gérer les marches
  const updateMarche = (id, field, value) => {
    setMarches(prev => {
      const updatedMarches = prev.map(m => 
        m.id === id ? { ...m, [field]: value } : m
      );
      
      // Si on vient de remplir une marche qui était vide, créer une nouvelle ligne vide
      const updatedMarche = updatedMarches.find(m => m.id === id);
      const isLastMarche = id === Math.max(...updatedMarches.map(m => m.id));
      
      if (isLastMarche && updatedMarche.largeurMax && updatedMarche.profondeurMax && 
          updatedMarche.largeurContremarche && updatedMarche.hauteur) {
        const newId = Math.max(...updatedMarches.map(m => m.id)) + 1;
        updatedMarches.push({ 
          id: newId, 
          largeurMax: '', 
          profondeurMax: '', 
          largeurContremarche: '', 
          hauteur: '', 
          notes: '' 
        });
      }
      
      return updatedMarches;
    });
  };

  const deleteMarche = (id) => {
    setMarches(prev => prev.filter(m => m.id !== id));
  };

  // Fonction pour copier la marche précédente
  const copyPreviousMarche = (currentId) => {
    const currentIndex = marches.findIndex(m => m.id === currentId);
    if (currentIndex > 0) {
      const previousMarche = marches[currentIndex - 1];
      updateMarche(currentId, 'largeurMax', previousMarche.largeurMax);
      updateMarche(currentId, 'profondeurMax', previousMarche.profondeurMax);
      updateMarche(currentId, 'largeurContremarche', previousMarche.largeurContremarche);
      updateMarche(currentId, 'hauteur', previousMarche.hauteur);
    }
  };

  // Fonction pour obtenir le numéro d'affichage d'une marche
  const getMarcheDisplayNumber = (marcheId) => {
    const validMarches = marches.filter(m => m.largeurMax && m.profondeurMax && m.largeurContremarche && m.hauteur);
    const marcheIndex = validMarches.findIndex(m => m.id === marcheId);
    return marcheIndex >= 0 ? marcheIndex + 1 : 'Nouveau';
  };

  // Fonction pour supprimer toutes les marches
  const deleteAllMarches = () => {
    setMarches([{ 
      id: 1, 
      largeurMax: '', 
      profondeurMax: '', 
      largeurContremarche: '', 
      hauteur: '', 
      notes: '' 
    }]);
    setShowDeleteAllModal(false);
  };

  // Fonction pour gérer le focus sur la marche suivante
  const handleNotesKeyDown = (e, currentId) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const nextId = currentId + 1;
      const nextLargeurMaxInput = document.getElementById(`largeurMax-${nextId}`);
      if (nextLargeurMaxInput) {
        nextLargeurMaxInput.focus();
      }
    }
  };

  // Génération du JSON d'export
  const generateExportData = () => {
    const validMarches = marches.filter(m => m.largeurMax && m.profondeurMax && m.largeurContremarche && m.hauteur);
    const validation = validateData();
    
    return {
      metadata: {
        version: "1.0",
        created: new Date().toISOString(),
        appVersion: "escalier-mesures-v1.0",
        type: "escalier-measurements"
      },
      project: {
        name: projectName.trim(),
        client: clientName.trim()
      },
      measurements: {
        totalMarches: validMarches.length,
        rawData: validMarches
      },
      validation: {
        isValid: validation.errors.length === 0,
        errors: validation.errors,
        warnings: validation.warnings
      },
      statistics: {
        totalMarches: validMarches.length,
        dimensionsRange: {
          largeurMaxMin: Math.min(...validMarches.map(m => m.largeurMax)),
          largeurMaxMax: Math.max(...validMarches.map(m => m.largeurMax)),
          profondeurMaxMin: Math.min(...validMarches.map(m => m.profondeurMax)),
          profondeurMaxMax: Math.max(...validMarches.map(m => m.profondeurMax)),
          largeurContremarcheMin: Math.min(...validMarches.map(m => m.largeurContremarche)),
          largeurContremarcheMax: Math.max(...validMarches.map(m => m.largeurContremarche)),
          hauteurMin: Math.min(...validMarches.map(m => m.hauteur)),
          hauteurMax: Math.max(...validMarches.map(m => m.hauteur))
        }
      }
    };
  };

  // Téléchargement du fichier JSON
  const downloadJSON = () => {
    const data = generateExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escalier-${projectName.trim().toLowerCase().replace(/\s+/g, '-') || 'mesures'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const validation = validateData();
  const validMarches = marches.filter(m => m.largeurMax && m.profondeurMax && m.largeurContremarche && m.hauteur);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Ruler className="text-blue-600" />
          Saisie des Mesures d'Escalier
        </h1>
        <p className="text-gray-600">
          App 1 - Mesure et configuration de votre projet de rénovation d'escalier
        </p>
      </div>

      {/* Informations du projet */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-800 mb-3">Informations du projet</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du projet *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Ex: Escalier principal maison Dupont"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Ex: M. et Mme Dupont"
            />
          </div>
        </div>
      </div>

      {/* Mesures des marches */}
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            Mesures des marches
          </h3>
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
            disabled={validMarches.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Tout supprimer
          </button>
        </div>
        
        <div className="grid gap-2">
          {marches.map((marche, index) => {
            const isLastMarche = index === marches.length - 1;
            const isEmpty = !marche.largeurMax && !marche.profondeurMax && !marche.largeurContremarche && !marche.hauteur;
            const displayNumber = getMarcheDisplayNumber(marche.id);
            const previousMarche = index > 0 ? marches[index - 1] : null;
            const canCopyPrevious = isLastMarche && isEmpty && previousMarche && 
              previousMarche.largeurMax && previousMarche.profondeurMax && 
              previousMarche.largeurContremarche && previousMarche.hauteur;
            
            return (
              <div key={marche.id} className="flex items-center gap-3 p-2 bg-white rounded border flex-wrap">
                <div className="font-medium text-green-800 w-12 text-sm">
                  {displayNumber}
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Largeur max:</label>
                  <input
                    id={`largeurMax-${marche.id}`}
                    type="number"
                    value={marche.largeurMax}
                    onChange={(e) => updateMarche(marche.id, 'largeurMax', parseInt(e.target.value) || '')}
                    className="w-20 p-1 border border-gray-300 rounded text-sm"
                    min="1"
                    placeholder="mm"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Profondeur max:</label>
                  <input
                    type="number"
                    value={marche.profondeurMax}
                    onChange={(e) => updateMarche(marche.id, 'profondeurMax', parseInt(e.target.value) || '')}
                    className="w-20 p-1 border border-gray-300 rounded text-sm"
                    min="1"
                    placeholder="mm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Largeur contremarche:</label>
                  <input
                    type="number"
                    value={marche.largeurContremarche}
                    onChange={(e) => updateMarche(marche.id, 'largeurContremarche', parseInt(e.target.value) || '')}
                    className="w-20 p-1 border border-gray-300 rounded text-sm"
                    min="1"
                    placeholder="mm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Hauteur:</label>
                  <input
                    type="number"
                    value={marche.hauteur}
                    onChange={(e) => updateMarche(marche.id, 'hauteur', parseInt(e.target.value) || '')}
                    className="w-20 p-1 border border-gray-300 rounded text-sm"
                    min="1"
                    placeholder="mm"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-gray-700">Notes:</label>
                  <input
                    type="text"
                    value={marche.notes}
                    onChange={(e) => updateMarche(marche.id, 'notes', e.target.value)}
                    onKeyDown={(e) => handleNotesKeyDown(e, marche.id)}
                    className="flex-1 p-1 border border-gray-300 rounded text-sm"
                    placeholder="Remarques..."
                  />
                </div>
                
                <div className="flex items-center gap-1">
                  {canCopyPrevious && (
                    <button
                      onClick={() => copyPreviousMarche(marche.id)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                      title={`Copier la marche précédente`}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                  
                  {!isLastMarche && (
                    <button
                      onClick={() => deleteMarche(marche.id)}
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
          Tapez Tab après les notes pour passer à la marche suivante. Utilisez le bouton copier pour reprendre les dimensions de la marche précédente.
        </div>
      </div>

      {/* Résumé du projet */}
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-yellow-800 mb-3">Résumé du projet</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {validMarches.length}
            </div>
            <div className="text-sm text-gray-600">Total marches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {validation.warnings.length}
            </div>
            <div className="text-sm text-gray-600">Alertes</div>
          </div>
        </div>
      </div>

      {/* Validation */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="mb-6">
          {validation.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                <AlertCircle className="w-5 h-5" />
                Erreurs à corriger
              </div>
              <ul className="list-disc list-inside text-red-700 text-sm">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 font-semibold mb-2">
                <AlertCircle className="w-5 h-5" />
                Avertissements
              </div>
              <ul className="list-disc list-inside text-yellow-700 text-sm">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Bouton d'export */}
      <div className="text-center">
        <button
          onClick={() => setShowExportModal(true)}
          disabled={validation.errors.length > 0}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto text-lg font-semibold"
        >
          {validation.errors.length > 0 ? (
            <>
              <AlertCircle className="w-5 h-5" />
              Corriger les erreurs pour continuer
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Exporter et passer à l'optimisation
            </>
          )}
        </button>
      </div>

      {/* Modal d'export */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-blue-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Prêt pour l'export
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium mb-2">Récapitulatif :</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Projet : <strong>{projectName || 'Sans nom'}</strong></li>
                  <li>• Total marches : <strong>{validMarches.length}</strong></li>
                </ul>
              </div>
              
              <p className="text-sm text-gray-600">
                Un fichier JSON sera téléchargé avec toutes vos mesures. 
                Vous pourrez l'importer dans l'app d'optimisation.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={downloadJSON}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-800">
              Supprimer toutes les marches
            </h3>
            
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer toutes les marches ? 
              Cette action est irréversible.
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
                onClick={deleteAllMarches}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};