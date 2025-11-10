import React, { useReducer, useEffect } from 'react';
import './App.css';
import {
  Project,
  AppState,
  AppAction,
  DEFAULT_CONSTRAINTS,
  ProjectStatus,
  TreadColor,
  RiserColor,
  ThresholdType,
  ProximityLevel,
} from './types';
import { saveProject, loadCurrentProject, setCurrentProjectId } from './utils/storage';
import { validateAllMeasurements } from './utils/validation';
import { optimizeRisers } from './algorithms/riserOptimizer';
import { optimizeTreads } from './algorithms/treadOptimizer';
import { generateShoppingList, generateCuttingInstructions, calculateOptimizationStats } from './utils/calculations';

// Import components
import ProjectManager from './components/ProjectManager';
import MeasurementGrid from './components/MeasurementGrid';
import PlankInventory from './components/PlankInventory';
import CuttingDiagrams from './components/CuttingDiagrams';
import ResultsDashboard from './components/ResultsDashboard';

// ============================================================================
// App Context
// ============================================================================

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = React.createContext<AppContextType | undefined>(undefined);

// ============================================================================
// App Reducer
// ============================================================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CREATE_PROJECT': {
      const newProject: Project = {
        id: `project_${Date.now()}`,
        name: action.payload.name,
        client: action.payload.client,
        proximity: {
          parking: ProximityLevel.MEDIUM,
          workspace: ProximityLevel.MEDIUM,
        },
        colors: {
          tread: TreadColor.OAK_NATURAL,
          riser: RiserColor.WHITE,
        },
        threshold: ThresholdType.FLAT,
        metadata: {
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          status: ProjectStatus.DRAFT,
        },
        measurements: [],
        measurementValidations: [],
        plankInventory: {
          treads: [],
          risers: [],
        },
        cuttingConstraints: DEFAULT_CONSTRAINTS,
      };

      saveProject(newProject);
      setCurrentProjectId(newProject.id);

      return {
        ...state,
        currentProject: newProject,
        projects: [...state.projects, newProject],
        errors: [],
      };
    }

    case 'LOAD_PROJECT': {
      // Projects loaded on mount, just set current
      const project = state.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        setCurrentProjectId(project.id);
        return {
          ...state,
          currentProject: project,
          errors: [],
        };
      }
      return state;
    }

    case 'UPDATE_PROJECT': {
      const updatedProject = action.payload.project;
      saveProject(updatedProject);

      return {
        ...state,
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        ),
      };
    }

    case 'DELETE_PROJECT': {
      const remainingProjects = state.projects.filter(
        p => p.id !== action.payload.projectId
      );

      return {
        ...state,
        currentProject: state.currentProject?.id === action.payload.projectId
          ? null
          : state.currentProject,
        projects: remainingProjects,
      };
    }

    case 'SET_ACTIVE_TAB': {
      return {
        ...state,
        activeTab: action.payload.tab,
      };
    }

    case 'UPDATE_MEASUREMENTS': {
      if (!state.currentProject) return state;

      const validations = validateAllMeasurements(action.payload.measurements);
      const updatedProject: Project = {
        ...state.currentProject,
        measurements: action.payload.measurements,
        measurementValidations: validations,
        metadata: {
          ...state.currentProject.metadata,
          status: validations.every(v => v.isComplete)
            ? ProjectStatus.MEASUREMENTS_COMPLETE
            : ProjectStatus.DRAFT,
        },
      };

      saveProject(updatedProject);

      return {
        ...state,
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        ),
      };
    }

    case 'UPDATE_INVENTORY': {
      if (!state.currentProject) return state;

      const updatedProject: Project = {
        ...state.currentProject,
        plankInventory: action.payload.inventory,
        metadata: {
          ...state.currentProject.metadata,
          status: ProjectStatus.INVENTORY_READY,
        },
      };

      saveProject(updatedProject);

      return {
        ...state,
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        ),
      };
    }

    case 'RUN_OPTIMIZATION': {
      return {
        ...state,
        isOptimizing: true,
        errors: [],
      };
    }

    case 'OPTIMIZATION_COMPLETE': {
      if (!state.currentProject) return state;

      const result = action.payload.result;
      const shoppingList = generateShoppingList(result);
      const cuttingInstructions = generateCuttingInstructions(result);

      const updatedProject: Project = {
        ...state.currentProject,
        optimizationResult: result,
        shoppingList,
        cuttingInstructions,
        metadata: {
          ...state.currentProject.metadata,
          status: ProjectStatus.OPTIMIZED,
        },
      };

      saveProject(updatedProject);

      return {
        ...state,
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        ),
        isOptimizing: false,
        activeTab: 'results',
      };
    }

    case 'OPTIMIZATION_ERROR': {
      return {
        ...state,
        isOptimizing: false,
        errors: [...state.errors, action.payload.error],
      };
    }

    case 'ADD_ERROR': {
      return {
        ...state,
        errors: [...state.errors, action.payload.error],
      };
    }

    case 'CLEAR_ERRORS': {
      return {
        ...state,
        errors: [],
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [state, dispatch] = useReducer(appReducer, {
    currentProject: null,
    projects: [],
    activeTab: 'measurements',
    isOptimizing: false,
    errors: [],
  });

  // Load current project on mount
  useEffect(() => {
    const project = loadCurrentProject();
    if (project) {
      dispatch({
        type: 'UPDATE_PROJECT',
        payload: { project },
      });
    }
  }, []);

  // Run optimization
  const runOptimization = async () => {
    if (!state.currentProject) return;

    dispatch({ type: 'RUN_OPTIMIZATION', payload: { constraints: state.currentProject.cuttingConstraints } });

    try {
      // Run riser optimization
      const riserResult = optimizeRisers(
        state.currentProject.measurements,
        state.currentProject.plankInventory.risers,
        state.currentProject.cuttingConstraints
      );

      // Run tread optimization
      const treadResult = optimizeTreads(
        state.currentProject.measurements,
        state.currentProject.plankInventory.treads,
        state.currentProject.cuttingConstraints
      );

      // Combine results
      const stats = calculateOptimizationStats(
        treadResult.layouts,
        riserResult.layouts
      );

      const totalPlanksUsed = {
        treads: treadResult.layouts.reduce((acc, layout) => {
          acc[layout.plankSpec.id] = (acc[layout.plankSpec.id] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number }),
        risers: riserResult.layouts.reduce((acc, layout) => {
          acc[layout.plankSpec.id] = (acc[layout.plankSpec.id] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number }),
      };

      const optimizationResult = {
        treadLayouts: treadResult.layouts,
        riserLayouts: riserResult.layouts,
        totalPlanksUsed,
        totalCost: stats.totalCost,
        totalWaste: stats.totalWaste,
        totalArea: stats.totalArea,
        overallEfficiency: stats.overallEfficiency,
        allPiecesFit: treadResult.allPiecesFit && riserResult.allPiecesFit,
        unfitPieces: [...treadResult.unfitPieces, ...riserResult.unfitPieces],
        optimizedAt: new Date().toISOString(),
      };

      dispatch({
        type: 'OPTIMIZATION_COMPLETE',
        payload: { result: optimizationResult },
      });
    } catch (error) {
      dispatch({
        type: 'OPTIMIZATION_ERROR',
        payload: { error: `Optimization failed: ${error}` },
      });
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Optimiseur de Découpe - Escaliers
            </h1>
          </div>
        </header>

        {/* Project Manager */}
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <ProjectManager />
        </div>

        {/* Main Content */}
        {state.currentProject && (
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: { tab: 'measurements' } })}
                  className={`${
                    state.activeTab === 'measurements'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Mesures
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: { tab: 'inventory' } })}
                  className={`${
                    state.activeTab === 'inventory'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Inventaire
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: { tab: 'optimization' } })}
                  className={`${
                    state.activeTab === 'optimization'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Optimisation
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: { tab: 'results' } })}
                  className={`${
                    state.activeTab === 'results'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  disabled={!state.currentProject.optimizationResult}
                >
                  Résultats
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {state.activeTab === 'measurements' && <MeasurementGrid />}
            {state.activeTab === 'inventory' && <PlankInventory />}
            {state.activeTab === 'optimization' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Lancer l'Optimisation</h2>
                <button
                  onClick={runOptimization}
                  disabled={state.isOptimizing || state.currentProject.measurements.length === 0}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {state.isOptimizing ? 'Optimisation en cours...' : 'Optimiser'}
                </button>
              </div>
            )}
            {state.activeTab === 'results' && state.currentProject.optimizationResult && (
              <>
                <CuttingDiagrams />
                <ResultsDashboard />
              </>
            )}
          </div>
        )}

        {/* Errors */}
        {state.errors.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-red-800 font-semibold">Erreurs:</h3>
              <ul className="list-disc list-inside">
                {state.errors.map((error, index) => (
                  <li key={index} className="text-red-700">{error}</li>
                ))}
              </ul>
              <button
                onClick={() => dispatch({ type: 'CLEAR_ERRORS' })}
                className="mt-2 text-red-600 underline"
              >
                Effacer
              </button>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}

export default App;
