import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';
import { getProjectsList, deleteProject } from '../../utils/storage';

const ProjectManager: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('ProjectManager must be used within AppContext');

  const { state, dispatch } = context;
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !clientName.trim()) {
      alert('Veuillez remplir le nom du projet et du client');
      return;
    }

    dispatch({
      type: 'CREATE_PROJECT',
      payload: {
        name: newProjectName,
        client: {
          name: clientName,
          postalCode: postalCode,
        },
      },
    });

    // Reset form
    setNewProjectName('');
    setClientName('');
    setPostalCode('');
    setShowNewProjectForm(false);
  };

  const handleLoadProject = (projectId: string) => {
    dispatch({ type: 'LOAD_PROJECT', payload: { projectId } });
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      deleteProject(projectId);
      dispatch({ type: 'DELETE_PROJECT', payload: { projectId } });
    }
  };

  const projectsList = getProjectsList();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {state.currentProject ? (
            <span>Projet: {state.currentProject.name}</span>
          ) : (
            <span>Gestion des Projets</span>
          )}
        </h2>
        <button
          onClick={() => setShowNewProjectForm(!showNewProjectForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus size={20} />
          Nouveau Projet
        </button>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold mb-3">Créer un Nouveau Projet</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du Projet *
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Ex: Escalier Dupont"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Nom du client"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code Postal
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="75000"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreateProject}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Créer
            </button>
            <button
              onClick={() => setShowNewProjectForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      {!state.currentProject && projectsList.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Projets Récents</h3>
          <div className="space-y-2">
            {projectsList.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen size={20} className="text-gray-500" />
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-gray-500">
                      Modifié: {new Date(project.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoadProject(project.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                  >
                    Ouvrir
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!state.currentProject && projectsList.length === 0 && !showNewProjectForm && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun projet trouvé. Créez un nouveau projet pour commencer.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
