// ============================================================================
// Core Type Definitions for Staircase Renovation Optimization App
// ============================================================================

// Enums for categorical data
export enum TreadColor {
  OAK_NATURAL = 'Chêne Naturel',
  OAK_DARK = 'Chêne Foncé',
  OAK_GREY = 'Chêne Gris',
  WALNUT = 'Noyer',
  ASH = 'Frêne',
}

export enum RiserColor {
  WHITE = 'Blanc',
  BLACK = 'Noir',
  GREY = 'Gris',
  SAME_AS_TREAD = 'Identique Marche',
}

export enum ThresholdType {
  FLAT = 'Marche Seuil Plate',
  CHAMFERED = 'Marche Seuil Chanfreinée',
  ALUMINUM = 'Aluminium',
}

export enum ProximityLevel {
  VERY_CLOSE = 'Très proche',
  CLOSE = 'Proche',
  MEDIUM = 'Moyen',
  FAR = 'Loin',
  VERY_FAR = 'Très loin',
}

export enum PlankType {
  TREAD = 'tread',
  RISER = 'riser',
}

export enum ProjectStatus {
  DRAFT = 'draft',
  MEASUREMENTS_COMPLETE = 'measurements_complete',
  INVENTORY_READY = 'inventory_ready',
  OPTIMIZED = 'optimized',
  COMPLETED = 'completed',
}

// ============================================================================
// Client & Project Metadata
// ============================================================================

export interface ClientInfo {
  name: string;
  postalCode: string;
  coordinates?: string; // GPS or Google coordinates
}

export interface Proximity {
  parking: ProximityLevel;
  workspace: ProximityLevel;
}

export interface Colors {
  tread: TreadColor;
  riser: RiserColor;
}

export interface ProjectMetadata {
  createdAt: string; // ISO date string
  lastModified: string; // ISO date string
  status: ProjectStatus;
  notes?: string;
}

// ============================================================================
// Step Measurements
// ============================================================================

export interface StepMeasurement {
  stepNumber: number;

  // Width measurements (mm)
  frontWidth: number;  // Nose width
  backWidth: number;   // Back width

  // Depth measurements (mm)
  leftDepth: number;
  centerDepth: number;
  rightDepth: number;

  // Riser measurements (mm)
  riserHeight: number;

  // Calculated values (derived from above)
  maxWidth?: number;   // max(frontWidth, backWidth)
  maxDepth?: number;   // max(leftDepth, centerDepth, rightDepth)
}

// Validation status for measurements
export interface MeasurementValidation {
  stepNumber: number;
  isComplete: boolean;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Plank Specifications
// ============================================================================

export interface PlankSpec {
  id: string;
  type: PlankType;

  // Dimensions (mm)
  width: number;      // For treads: includes nosing on both long edges
  length: number;     // For treads: depth dimension
  thickness: number;  // Standard: 20mm for treads, 18mm for risers

  // For treads only
  hasNosing: boolean;
  nosingDepth?: number; // typically 30mm

  // Inventory & pricing
  pricePerPlank: number; // €
  stockQuantity?: number;

  // Metadata
  name?: string; // User-friendly name for the plank type
  supplier?: string;
}

export interface PlankInventory {
  treads: PlankSpec[];
  risers: PlankSpec[];
}

// ============================================================================
// Cutting & Optimization
// ============================================================================

export interface CuttingConstraints {
  sawBladeKerf: number;      // mm, default 10mm
  safetyMargin: number;      // mm, default 5mm
  allowTreadRotation: boolean; // Limited to 0°, 180° for treads
  allowRiserRotation: boolean; // Full rotation 0°, 90° for risers
}

export interface Piece {
  id: string;
  stepNumber: number;
  width: number;  // mm
  height: number; // mm (or depth for treads)
  area: number;   // mm²
  type: PlankType;

  // For treads
  requiresNose?: boolean;
  noseDirection?: 'width' | 'height'; // Which dimension has the nose
}

export interface PlacedPiece extends Piece {
  x: number;      // Position on plank
  y: number;      // Position on plank
  rotation: 0 | 90 | 180 | 270; // Rotation angle in degrees
  plankId: string;
}

export interface PlankLayout {
  plankSpec: PlankSpec;
  plankIndex: number; // Which plank of this type (1st, 2nd, 3rd...)
  placedPieces: PlacedPiece[];
  efficiency: number; // Percentage (0-100)
  wasteArea: number;  // mm²
  totalArea: number;  // mm²
}

export interface OptimizationResult {
  treadLayouts: PlankLayout[];
  riserLayouts: PlankLayout[];

  // Summary statistics
  totalPlanksUsed: {
    treads: { [plankId: string]: number };
    risers: { [plankId: string]: number };
  };

  totalCost: number; // €
  totalWaste: number; // mm²
  totalArea: number;  // mm²
  overallEfficiency: number; // Percentage

  // Validation
  allPiecesFit: boolean;
  unfitPieces: Piece[];

  // Timestamp
  optimizedAt: string; // ISO date string
}

// ============================================================================
// Cutting Instructions
// ============================================================================

export interface CuttingInstruction {
  stepNumber: number;
  instructionNumber: number;
  plankId: string;
  plankIndex: number;
  pieceType: PlankType;

  // What to cut
  width: number;
  height: number;

  // How to position
  rotation: number;
  noseOrientation?: string;

  // Where on the plank
  position: { x: number; y: number };

  // Safety notes
  notes?: string[];
}

export interface ShoppingListItem {
  plankSpec: PlankSpec;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purpose: string; // e.g., "Treads" or "Risers"
}

export interface ShoppingList {
  items: ShoppingListItem[];
  grandTotal: number;
  estimatedWaste: number; // percentage
  generatedAt: string; // ISO date string
}

// ============================================================================
// Complete Project Structure
// ============================================================================

export interface Project {
  id: string;
  name: string;

  // Client & metadata
  client: ClientInfo;
  proximity: Proximity;
  colors: Colors;
  threshold: ThresholdType;
  metadata: ProjectMetadata;

  // Measurements
  measurements: StepMeasurement[];
  measurementValidations: MeasurementValidation[];

  // Inventory
  plankInventory: PlankInventory;

  // Optimization
  cuttingConstraints: CuttingConstraints;
  optimizationResult?: OptimizationResult;

  // Instructions & shopping
  cuttingInstructions?: CuttingInstruction[];
  shoppingList?: ShoppingList;
}

// ============================================================================
// UI State & Context
// ============================================================================

export interface AppState {
  currentProject: Project | null;
  projects: Project[];
  activeTab: 'measurements' | 'inventory' | 'optimization' | 'results';
  isOptimizing: boolean;
  errors: string[];
}

export type AppAction =
  | { type: 'CREATE_PROJECT'; payload: { name: string; client: ClientInfo } }
  | { type: 'LOAD_PROJECT'; payload: { projectId: string } }
  | { type: 'UPDATE_PROJECT'; payload: { project: Project } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: { tab: AppState['activeTab'] } }
  | { type: 'UPDATE_MEASUREMENTS'; payload: { measurements: StepMeasurement[] } }
  | { type: 'UPDATE_INVENTORY'; payload: { inventory: PlankInventory } }
  | { type: 'RUN_OPTIMIZATION'; payload: { constraints: CuttingConstraints } }
  | { type: 'OPTIMIZATION_COMPLETE'; payload: { result: OptimizationResult } }
  | { type: 'OPTIMIZATION_ERROR'; payload: { error: string } }
  | { type: 'ADD_ERROR'; payload: { error: string } }
  | { type: 'CLEAR_ERRORS' };

// ============================================================================
// Utility Types
// ============================================================================

export interface ValidationRule<T> {
  field: keyof T;
  validator: (value: any) => boolean;
  errorMessage: string;
  warningMessage?: string;
}

export interface Bounds {
  min: number;
  max: number;
  unit: string;
}

// Standard measurement bounds for validation
export const MEASUREMENT_BOUNDS = {
  width: { min: 600, max: 1500, unit: 'mm' } as Bounds,
  depth: { min: 200, max: 400, unit: 'mm' } as Bounds,
  height: { min: 150, max: 220, unit: 'mm' } as Bounds,
  thickness: { min: 15, max: 30, unit: 'mm' } as Bounds,
} as const;

// Default values
export const DEFAULT_CONSTRAINTS: CuttingConstraints = {
  sawBladeKerf: 10,
  safetyMargin: 5,
  allowTreadRotation: true, // Limited to 0°, 180°
  allowRiserRotation: true, // Full rotation
};

export const DEFAULT_TREAD_THICKNESS = 20; // mm
export const DEFAULT_RISER_THICKNESS = 18; // mm
export const DEFAULT_NOSING_DEPTH = 30; // mm
