// ============================================================================
// Riser Optimization Engine
// Full rotation allowed (0°, 90°)
// ============================================================================

import {
  StepMeasurement,
  PlankSpec,
  PlankType,
  CuttingConstraints,
  Piece,
  PlankLayout,
} from '../types';
import { createBinPacker, PackingResult } from './binPacking';

/**
 * Create riser pieces from step measurements
 */
export function createRiserPieces(measurements: StepMeasurement[]): Piece[] {
  return measurements.map((measurement) => {
    const width = measurement.frontWidth;
    const height = measurement.riserHeight;

    return {
      id: `riser-${measurement.stepNumber}`,
      stepNumber: measurement.stepNumber,
      width,
      height,
      area: width * height,
      type: PlankType.RISER,
      requiresNose: false,
    };
  });
}

/**
 * Optimize riser cutting from available plank inventory
 */
export function optimizeRisers(
  measurements: StepMeasurement[],
  riserPlanks: PlankSpec[],
  constraints: CuttingConstraints
): {
  layouts: PlankLayout[];
  totalCost: number;
  totalWaste: number;
  allPiecesFit: boolean;
  unfitPieces: Piece[];
} {
  // Create riser pieces from measurements
  const pieces = createRiserPieces(measurements);

  // Risers can rotate 0° or 90°
  const allowedRotations = constraints.allowRiserRotation ? [0, 90] : [0];
  const binPacker = createBinPacker(constraints, allowedRotations);

  // Try each plank type and find the most cost-effective solution
  let bestSolution: {
    layouts: PlankLayout[];
    totalCost: number;
    totalWaste: number;
  } | null = null;

  for (const plankSpec of riserPlanks) {
    const maxPlanks = plankSpec.stockQuantity || 20;
    const packingResults = binPacker.packIntoPlanks(pieces, plankSpec, maxPlanks);

    const layouts = convertPackingResultsToLayouts(packingResults);
    const totalCost = calculateTotalCost(layouts);
    const totalWaste = layouts.reduce((sum, l) => sum + l.wasteArea, 0);

    // Check if all pieces fit
    const allPlaced = new Set(
      layouts.flatMap(l => l.placedPieces.map(p => p.id))
    );
    const allPiecesFit = pieces.every(p => allPlaced.has(p.id));

    if (allPiecesFit) {
      if (!bestSolution || totalCost < bestSolution.totalCost) {
        bestSolution = { layouts, totalCost, totalWaste };
      }
    }
  }

  // If no single plank type works, try combinations
  if (!bestSolution) {
    const combinedSolution = optimizeWithMultiplePlankTypes(
      pieces,
      riserPlanks,
      constraints,
      allowedRotations
    );
    bestSolution = combinedSolution;
  }

  // Determine which pieces didn't fit
  const allPlaced = new Set(
    bestSolution.layouts.flatMap(l => l.placedPieces.map(p => p.id))
  );
  const unfitPieces = pieces.filter(p => !allPlaced.has(p.id));

  return {
    layouts: bestSolution.layouts,
    totalCost: bestSolution.totalCost,
    totalWaste: bestSolution.totalWaste,
    allPiecesFit: unfitPieces.length === 0,
    unfitPieces,
  };
}

/**
 * Optimize using multiple plank types (greedy approach)
 */
function optimizeWithMultiplePlankTypes(
  pieces: Piece[],
  plankSpecs: PlankSpec[],
  constraints: CuttingConstraints,
  allowedRotations: number[]
): {
  layouts: PlankLayout[];
  totalCost: number;
  totalWaste: number;
} {
  const layouts: PlankLayout[] = [];
  const remainingPieces = [...pieces];

  // Sort plank specs by efficiency (area/cost)
  const sortedPlanks = [...plankSpecs].sort((a, b) => {
    const efficiencyA = (a.width * a.length) / a.pricePerPlank;
    const efficiencyB = (b.width * b.length) / b.pricePerPlank;
    return efficiencyB - efficiencyA;
  });

  let iterations = 0;
  const maxIterations = 100;

  while (remainingPieces.length > 0 && iterations < maxIterations) {
    let bestResult: {
      result: PackingResult;
      plankSpec: PlankSpec;
    } | null = null;
    let bestPiecesPlaced = 0;

    // Try each plank type
    for (const plankSpec of sortedPlanks) {
      const binPacker = createBinPacker(constraints, allowedRotations);
      const results = binPacker.packIntoPlanks(remainingPieces, plankSpec, 1);

      if (results.length > 0 && results[0].placedPieces.length > bestPiecesPlaced) {
        bestPiecesPlaced = results[0].placedPieces.length;
        bestResult = { result: results[0], plankSpec };
      }
    }

    if (!bestResult || bestPiecesPlaced === 0) {
      break; // No more pieces can be placed
    }

    // Add the best result
    const layout = convertPackingResultToLayout(
      bestResult.result,
      layouts.length
    );
    layouts.push(layout);

    // Remove placed pieces
    const placedIds = new Set(bestResult.result.placedPieces.map(p => p.id));
    remainingPieces.splice(
      0,
      remainingPieces.length,
      ...remainingPieces.filter(p => !placedIds.has(p.id))
    );

    iterations++;
  }

  const totalCost = calculateTotalCost(layouts);
  const totalWaste = layouts.reduce((sum, l) => sum + l.wasteArea, 0);

  return { layouts, totalCost, totalWaste };
}

/**
 * Convert multiple packing results to plank layouts
 */
function convertPackingResultsToLayouts(results: PackingResult[]): PlankLayout[] {
  return results.map((result, index) => convertPackingResultToLayout(result, index));
}

/**
 * Convert a single packing result to plank layout
 */
function convertPackingResultToLayout(
  result: PackingResult,
  index: number
): PlankLayout {
  return {
    plankSpec: result.plankSpec,
    plankIndex: index,
    placedPieces: result.placedPieces,
    efficiency: result.efficiency,
    wasteArea: result.wasteArea,
    totalArea: result.totalArea,
  };
}

/**
 * Calculate total cost of layouts
 */
function calculateTotalCost(layouts: PlankLayout[]): number {
  return layouts.reduce((sum, layout) => sum + layout.plankSpec.pricePerPlank, 0);
}
