import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { StepMeasurement } from '../../types';
import { Plus, Minus, AlertTriangle, CheckCircle } from 'lucide-react';

const MeasurementGrid: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('MeasurementGrid must be used within AppContext');

  const { state, dispatch } = context;
  const [numSteps, setNumSteps] = useState(state.currentProject?.measurements.length || 15);

  if (!state.currentProject) return null;

  const measurements = state.currentProject.measurements;
  const validations = state.currentProject.measurementValidations;

  const initializeMeasurements = (count: number) => {
    const newMeasurements: StepMeasurement[] = [];
    for (let i = 1; i <= count; i++) {
      const existing = measurements.find(m => m.stepNumber === i);
      if (existing) {
        newMeasurements.push(existing);
      } else {
        newMeasurements.push({
          stepNumber: i,
          frontWidth: 0,
          backWidth: 0,
          leftDepth: 0,
          centerDepth: 0,
          rightDepth: 0,
          riserHeight: 0,
        });
      }
    }
    dispatch({
      type: 'UPDATE_MEASUREMENTS',
      payload: { measurements: newMeasurements },
    });
  };

  const updateMeasurement = (stepNumber: number, field: keyof StepMeasurement, value: number) => {
    const updated = measurements.map(m =>
      m.stepNumber === stepNumber ? { ...m, [field]: value } : m
    );
    dispatch({
      type: 'UPDATE_MEASUREMENTS',
      payload: { measurements: updated },
    });
  };

  const addStep = () => {
    const newNum = numSteps + 1;
    setNumSteps(newNum);
    initializeMeasurements(newNum);
  };

  const removeStep = () => {
    if (numSteps > 1) {
      const newNum = numSteps - 1;
      setNumSteps(newNum);
      const updated = measurements.filter(m => m.stepNumber <= newNum);
      dispatch({
        type: 'UPDATE_MEASUREMENTS',
        payload: { measurements: updated },
      });
    }
  };

  // Initialize if empty
  if (measurements.length === 0 && numSteps > 0) {
    initializeMeasurements(numSteps);
  }

  const getValidationForStep = (stepNumber: number) => {
    return validations.find(v => v.stepNumber === stepNumber);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Mesures des Marches</h2>
        <div className="flex gap-2">
          <button
            onClick={removeStep}
            disabled={numSteps <= 1}
            className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
          >
            <Minus size={16} />
            Retirer
          </button>
          <button
            onClick={addStep}
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-2 text-sm">N°</th>
              <th className="border border-gray-300 px-2 py-2 text-sm">Largeur Avant (mm)</th>
              <th className="border border-gray-300 px-2 py-2 text-sm">Largeur Arrière (mm)</th>
              <th className="border border-gray-300 px-2 py-2 text-sm">Profondeur Gauche (mm)</th>
              <th className="border border-gray-300 px-2 py-2 text-sm">Profondeur Centre (mm)</th>
              <th className="border border-gray-300 px-2 py-2 text-sm">Profondeur Droite (mm)</th>
              <th className="border border-gray-300 px-2 py-2 text-sm">Hauteur Contremarche (mm)</th>
              <th className="border border-gray-300 px-2 py-2 text-sm">État</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((measurement) => {
              const validation = getValidationForStep(measurement.stepNumber);
              const hasWarnings = validation && validation.warnings.length > 0;
              const hasErrors = validation && validation.errors.length > 0;

              return (
                <tr key={measurement.stepNumber} className={hasErrors ? 'bg-red-50' : hasWarnings ? 'bg-yellow-50' : ''}>
                  <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                    {measurement.stepNumber}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={measurement.frontWidth || ''}
                      onChange={(e) => updateMeasurement(measurement.stepNumber, 'frontWidth', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={measurement.backWidth || ''}
                      onChange={(e) => updateMeasurement(measurement.stepNumber, 'backWidth', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={measurement.leftDepth || ''}
                      onChange={(e) => updateMeasurement(measurement.stepNumber, 'leftDepth', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={measurement.centerDepth || ''}
                      onChange={(e) => updateMeasurement(measurement.stepNumber, 'centerDepth', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={measurement.rightDepth || ''}
                      onChange={(e) => updateMeasurement(measurement.stepNumber, 'rightDepth', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={measurement.riserHeight || ''}
                      onChange={(e) => updateMeasurement(measurement.stepNumber, 'riserHeight', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {validation?.isComplete ? (
                      <CheckCircle size={20} className="text-green-600 mx-auto" />
                    ) : (
                      <AlertTriangle size={20} className="text-yellow-600 mx-auto" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h3 className="font-semibold mb-2">Résumé</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total marches:</span>{' '}
            <span className="font-semibold">{measurements.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Complètes:</span>{' '}
            <span className="font-semibold text-green-600">
              {validations.filter(v => v.isComplete).length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Avertissements:</span>{' '}
            <span className="font-semibold text-yellow-600">
              {validations.filter(v => v.warnings.length > 0).length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Erreurs:</span>{' '}
            <span className="font-semibold text-red-600">
              {validations.filter(v => v.errors.length > 0).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementGrid;
