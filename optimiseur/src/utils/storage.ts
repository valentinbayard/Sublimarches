// ============================================================================
// LocalStorage Utilities for Project Persistence
// ============================================================================

import { Project } from '../types';

const STORAGE_KEY_PREFIX = 'staircase_app_';
const PROJECTS_LIST_KEY = `${STORAGE_KEY_PREFIX}projects_list`;
const CURRENT_PROJECT_KEY = `${STORAGE_KEY_PREFIX}current_project`;

/**
 * Save a project to localStorage
 */
export function saveProject(project: Project): boolean {
  try {
    // Update last modified timestamp
    const updatedProject: Project = {
      ...project,
      metadata: {
        ...project.metadata,
        lastModified: new Date().toISOString(),
      },
    };

    // Save project
    const projectKey = `${STORAGE_KEY_PREFIX}project_${project.id}`;
    localStorage.setItem(projectKey, JSON.stringify(updatedProject));

    // Update projects list
    const projectsList = getProjectsList();
    const existingIndex = projectsList.findIndex((p) => p.id === project.id);

    if (existingIndex >= 0) {
      projectsList[existingIndex] = {
        id: updatedProject.id,
        name: updatedProject.name,
        lastModified: updatedProject.metadata.lastModified,
        status: updatedProject.metadata.status,
      };
    } else {
      projectsList.push({
        id: updatedProject.id,
        name: updatedProject.name,
        lastModified: updatedProject.metadata.lastModified,
        status: updatedProject.metadata.status,
      });
    }

    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectsList));

    return true;
  } catch (error) {
    console.error('Error saving project:', error);
    return false;
  }
}

/**
 * Load a project from localStorage
 */
export function loadProject(projectId: string): Project | null {
  try {
    const projectKey = `${STORAGE_KEY_PREFIX}project_${projectId}`;
    const projectJson = localStorage.getItem(projectKey);

    if (!projectJson) {
      return null;
    }

    return JSON.parse(projectJson) as Project;
  } catch (error) {
    console.error('Error loading project:', error);
    return null;
  }
}

/**
 * Delete a project from localStorage
 */
export function deleteProject(projectId: string): boolean {
  try {
    const projectKey = `${STORAGE_KEY_PREFIX}project_${projectId}`;
    localStorage.removeItem(projectKey);

    // Update projects list
    const projectsList = getProjectsList();
    const filteredList = projectsList.filter((p) => p.id !== projectId);
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(filteredList));

    // Clear current project if it was deleted
    const currentProjectId = getCurrentProjectId();
    if (currentProjectId === projectId) {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }

    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

/**
 * Get list of all projects (metadata only)
 */
export function getProjectsList(): Array<{
  id: string;
  name: string;
  lastModified: string;
  status: string;
}> {
  try {
    const listJson = localStorage.getItem(PROJECTS_LIST_KEY);
    if (!listJson) {
      return [];
    }
    return JSON.parse(listJson);
  } catch (error) {
    console.error('Error getting projects list:', error);
    return [];
  }
}

/**
 * Set current project ID
 */
export function setCurrentProjectId(projectId: string): void {
  localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
}

/**
 * Get current project ID
 */
export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_PROJECT_KEY);
}

/**
 * Load current project
 */
export function loadCurrentProject(): Project | null {
  const projectId = getCurrentProjectId();
  if (!projectId) {
    return null;
  }
  return loadProject(projectId);
}

/**
 * Export project as JSON file
 */
export function exportProjectAsJSON(project: Project): void {
  const dataStr = JSON.stringify(project, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `staircase-${project.name.replace(/\s+/g, '-')}-${project.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import project from JSON file
 */
export function importProjectFromJSON(
  jsonString: string
): { success: boolean; project?: Project; error?: string } {
  try {
    const project = JSON.parse(jsonString) as Project;

    // Validate basic structure
    if (!project.id || !project.name || !project.client) {
      return {
        success: false,
        error: 'Invalid project file: missing required fields',
      };
    }

    // Save imported project
    const saved = saveProject(project);

    if (saved) {
      return { success: true, project };
    } else {
      return { success: false, error: 'Failed to save imported project' };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse project file: ${error}`,
    };
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): {
  used: number;
  available: number;
  percentageUsed: number;
} {
  let used = 0;

  // Calculate used storage
  for (const key in localStorage) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
    }
  }

  // localStorage limit is typically 5MB (5 * 1024 * 1024 bytes)
  const available = 5 * 1024 * 1024;
  const percentageUsed = (used / available) * 100;

  return {
    used,
    available,
    percentageUsed,
  };
}

/**
 * Clear all app data from localStorage
 */
export function clearAllData(): boolean {
  try {
    const keysToRemove: string[] = [];

    for (const key in localStorage) {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
}

/**
 * Auto-save functionality
 */
let autoSaveTimeout: NodeJS.Timeout | null = null;

export function scheduleAutoSave(
  project: Project,
  delayMs: number = 2000
): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  autoSaveTimeout = setTimeout(() => {
    saveProject(project);
    console.log('Project auto-saved');
  }, delayMs);
}

/**
 * Cancel pending auto-save
 */
export function cancelAutoSave(): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }
}
