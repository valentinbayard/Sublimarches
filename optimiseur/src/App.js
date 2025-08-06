import React, { useState } from 'react';
import { Calculator, Download, Plus, Trash2, X, Copy } from 'lucide-react';

const StairMeasurementApp = () => {
  const [projectName, setProjectName] = useState('');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
  // Marches de l'escalier - initialisation vide
  const [steps, setSteps] = useState([
    { id: 1, maxWidth: '', maxDepth: '', riserWidth: '', height: '', comment: '' }
  ]);

  // Fonctions pour gérer les marches
  const updateStep = (id, field, value) => {
    setSteps(prev => {
      const updatedSteps = prev.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      );
      
      // Si on vient de remplir une marche qui était vide, créer une nouvelle ligne vide
      const updatedStep = updatedSteps.find(s => s.id === id);
      const isLastStep = id === Math.max(...updatedSteps.map(s => s.id));
      
      if (isLastStep && updatedStep.maxWidth && updatedStep.maxDepth && 
          updatedStep.riserWidth && updatedStep.height) {
        const newId = Math.max(...updatedSteps.map(s => s.id)) + 1;
        updatedSteps.push({ id: newId, maxWidth: '', maxDepth: '', riserWidth: '', height: '', comment: '' });
      }
      
      return updatedSteps;
    });
  };

  const deleteStep = (id) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  // Fonction pour copier la marche précédente
  const copyPreviousStep = (currentId) => {
    const currentIndex = steps.findIndex(s => s.id === currentId);
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1];
      updateStep(currentId, 'maxWidth', previousStep.maxWidth);
      updateStep(currentId, 'maxDepth', previousStep.maxDepth);
      updateStep(currentId, 'riserWidth', previousStep.riserWidth);
      updateStep(currentId, 'height', previousStep.height);
      updateStep(currentId, 'comment', previousStep.comment);
    }
  };

  // Fonction pour obtenir le numéro d'affichage d'une marche
  const getStepDisplayNumber = (stepId) => {
    const validSteps = steps.filter(s => s.maxWidth && s.maxDepth && s.riserWidth && s.height);
    const stepIndex = validSteps.findIndex(s => s.id === stepId);
    return stepIndex >= 0 ? stepIndex + 1 : 'Nouvelle';
  };

  // Fonction pour supprimer toutes les marches
  const deleteAllSteps = () => {
    setSteps([{ id: 1, maxWidth: '', maxDepth: '', riserWidth: '', height: '', comment: '' }]);
    setShowDeleteAllModal(false);
  };

  // Fonction pour gérer la navigation au clavier
  const handleFieldKeyDown = (e, currentId, currentField) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      const fieldOrder = ['maxWidth', 'maxDepth', 'riserWidth', 'height', 'comment'];
      const currentFieldIndex = fieldOrder.indexOf(currentField);
      
      if (currentFieldIndex < fieldOrder.length - 1) {
        // Passer au champ suivant de la même marche
        const nextField = fieldOrder[currentFieldIndex + 1];
        const nextInput = document.getElementById(`${nextField}-${currentId}`);
        if (nextInput) {
          nextInput.focus();
        }
      } else {
        // Passer à la première marche de la marche suivante
        const nextId = currentId + 1;
        const nextInput = document.getElementById(`maxWidth-${nextId}`);
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };

  // Générer les données pour export JSON
  const generateProjectData = () => {
    const validSteps = steps.filter(s => s.maxWidth && s.maxDepth && s.riserWidth && s.height);
    
    return {
      metadata: {
        version: "1.0",
        created: new Date().toISOString(),
        appVersion: "stair-measurement-v1.0",
        type: "stair-measurement"
      },
      project: {
        name: projectName || "Escalier sans nom",
        description: "Mesures d'escalier pour optimisation de découpe"
      },
      stairs: {
        totalSteps: validSteps.length,
        steps: validSteps.map((step, index) => ({
          stepNumber: index + 1,
          maxWidth: parseInt(step.maxWidth),
          maxDepth: parseInt(step.maxDepth),
          riserWidth: parseInt(step.riserWidth),
          height: parseInt(step.height),
          comment: step.comment || '',
          // Calculs automatiques pour référence
          calculated: {
            riserSurface: parseInt(step.riserWidth) * parseInt(step.height),
            treadSurface: parseInt(step.maxWidth) * parseInt(step.maxDepth)
          }
        }))
      },
      validation: {
        errors: [],
        warnings: generateWarnings(validSteps),
        isValid: validSteps.length > 0
      }
    };
  };

  // Générer des avertissements
  const generateWarnings = (validSteps) => {
    const warnings = [];
    
    if (validSteps.length === 0) {
      warnings.push("Aucune marche mesurée");
      return warnings;
    }

    // Vérifier la cohérence des hauteurs
    const heights = validSteps.map(s => parseInt(s.height));
    const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
    const maxDeviation = Math.max(...heights.map(h => Math.abs(h - avgHeight)));
    
    if (maxDeviation > 10) {
      warnings.push(`Hauteurs de marches variables (écart max: ${maxDeviation}mm)`);
    }

    // Vérifier les dimensions minimales
    validSteps.forEach((step, index) => {
      if (parseInt(step.maxWidth) < 600) {
        warnings.push(`Marche ${index + 1}: largeur faible (${step.maxWidth}mm)`);
      }
      if (parseInt(step.maxDepth) < 200) {
        warnings.push(`Marche ${index + 1}: profondeur faible (${step.maxDepth}mm)`);
      }
    });

    return warnings;
  };

  // Exporter les données
  const exportData = () => {
    const data = generateProjectData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'escalier'}-mesures.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Statistiques du projet
  const validSteps = steps.filter(s => s.maxWidth && s.maxDepth && s.riserWidth && s.height);
  const totalRiserSurface = validSteps.reduce((sum, step) => 
    sum + (parseInt(step.riserWidth) * parseInt(step.height)), 0
  );
  const totalTreadSurface = validSteps.reduce((sum, step) => 
    sum + (parseInt(step.maxWidth) * parseInt(step.maxDepth)), 0
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Calculator className="text-blue-600" />
          Mesures d'Escalier
        </h1>
        <p className="text-gray-600">
          Étape 1/3 : Saisissez les dimensions de chaque marche de votre escalier
        </p>
      </div>

      {/* Configuration du projet */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-800 mb-3">Informations du projet</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom du projet
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Ex: Escalier principal maison Dupont"
          />
        </div>
      </div>

      {/* Marches de l'escalier */}
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Mesures des marches
          </h3>
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
            disabled={validSteps.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Tout supprimer
          </button>
        </div>
        
        <div className="grid gap-3">
          {steps.map((step, index) => {
            const isLastStep = index === steps.length - 1;
            const isEmpty = !step.maxWidth && !step.maxDepth && !step.riserWidth && !step.height;
            const displayNumber = getStepDisplayNumber(step.id);
            const previousStep = index > 0 ? steps[index - 1] : null;
            const canCopyPrevious = isLastStep && isEmpty && previousStep && 
              previousStep.maxWidth && previousStep.maxDepth && previousStep.riserWidth && previousStep.height;
            
            return (
              <div key={step.id} className="p-3 bg-white rounded border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="font-medium text-green-800 w-16 text-sm">
                    Marche {displayNumber}
                  </div>
                  
                  {canCopyPrevious && (
                    <button
                      onClick={() => copyPreviousStep(step.id)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 flex items-center gap-1"
                      title="Copier les mesures de la marche précédente"
                    >
                      <Copy className="w-3 h-3" />
                      Copier précédente
                    </button>
                  )}
                  
                  {!isLastStep && (
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Largeur max (mm)
                    </label>
                    <input
                      id={`maxWidth-${step.id}`}
                      type="number"
                      value={step.maxWidth}
                      onChange={(e) => updateStep(step.id, 'maxWidth', e.target.value)}
                      onKeyDown={(e) => handleFieldKeyDown(e, step.id, 'maxWidth')}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="ex: 1200"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Profondeur max (mm)
                    </label>
                    <input
                      id={`maxDepth-${step.id}`}
                      type="number"
                      value={step.maxDepth}
                      onChange={(e) => updateStep(step.id, 'maxDepth', e.target.value)}
                      onKeyDown={(e) => handleFieldKeyDown(e, step.id, 'maxDepth')}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="ex: 300"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Largeur contremarche (mm)
                    </label>
                    <input
                      id={`riserWidth-${step.id}`}
                      type="number"
                      value={step.riserWidth}
                      onChange={(e) => updateStep(step.id, 'riserWidth', e.target.value)}
                      onKeyDown={(e) => handleFieldKeyDown(e, step.id, 'riserWidth')}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="ex: 1150"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hauteur (mm)
                    </label>
                    <input
                      id={`height-${step.id}`}
                      type="number"
                      value={step.height}
                      onChange={(e) => updateStep(step.id, 'height', e.target.value)}
                      onKeyDown={(e) => handleFieldKeyDown(e, step.id, 'height')}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="ex: 180"
                      min="1"
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Commentaire (optionnel)
                  </label>
                  <input
                    id={`comment-${step.id}`}
                    type="text"
                    value={step.comment}
                    onChange={(e) => updateStep(step.id, 'comment', e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, step.id, 'comment')}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                    placeholder="ex: marche avec pilier, attention découpe spéciale..."
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-3 text-xs text-green-700">
          💡 Utilisez Tab pour naviguer rapidement entre les champs. Cliquez "Copier précédente" pour réutiliser les mesures.
        </div>
      </div>

      {/* Statistiques */}
      {validSteps.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Résumé du projet</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{validSteps.length}</div>
              <div className="text-sm text-gray-600">Marches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {(totalRiserSurface / 1000000).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">m² contremarches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {(totalTreadSurface / 1000000).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">m² dessus marches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {((totalRiserSurface + totalTreadSurface) / 1000000).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">m² total</div>
            </div>
          </div>
        </div>
      )}

      {/* Validation et avertissements */}
      {validSteps.length > 0 && (
        <div className="mb-6">
          {generateWarnings(validSteps).map((warning, index) => (
            <div key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-2">
              <div className="text-yellow-800 text-sm">⚠️ {warning}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton d'export */}
      <div className="text-center">
        <button
          onClick={exportData}
          disabled={validSteps.length === 0}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto text-lg font-semibold"
        >
          <Download className="w-5 h-5" />
          Exporter les mesures
          {validSteps.length > 0 && <span className="text-sm">({validSteps.length} marche{validSteps.length > 1 ? 's' : ''})</span>}
        </button>
        
        {validSteps.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Ajoutez au moins une marche complète pour pouvoir exporter
          </p>
        )}
      </div>

      {/* Modal de suppression */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-800">
              Supprimer toutes les marches
            </h3>
            
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer toutes les mesures ? 
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
                onClick={deleteAllSteps}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📋 Instructions</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Largeur max :</strong> Largeur maximale disponible pour la marche</p>
          <p><strong>Profondeur max :</strong> Profondeur maximale disponible pour la marche</p>
          <p><strong>Largeur contremarche :</strong> Largeur de la partie verticale</p>
          <p><strong>Hauteur :</strong> Hauteur de la contremarche (entre 2 marches)</p>
        </div>
        <div className="mt-3 text-xs text-blue-600">
          Une fois les mesures saisies, exportez le fichier JSON pour passer à l'étape 2 : optimisation des contremarches.
        </div>
      </div>
    </div>
  );
};

export default StairMeasurementApp;