// ============================================================================
// Tread Optimization Engine
// Limited rotation (0°, 180° only) - nose must align with long edge
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
 * Create tread pieces from step measurements
 */
export function createTreadPieces(
  measurements: StepMeasurement[],
  nosingDepth: number = 30
): Piece[] {
  return measurements.map((measurement) => {
    // Use maximum dimensions for safety
    const maxWidth = Math.max(measurement.frontWidth, measurement.backWidth);
    const maxDepth = Math.max(
      measurement.leftDepth,
      measurement.centerDepth,
      measurement.rightDepth
    );

    return {
      id: `tread-${measurement.stepNumber}`,
      stepNumber: measurement.stepNumber,
      width: maxWidth,
      height: maxDepth, // Using height field for depth
      area: maxWidth * maxDepth,
      type: PlankType.TREAD,
      requiresNose: true,
      noseDirection: 'width', // Nose runs along the width dimension
    };
  });
}

/**
 * Optimize tread cutting from available plank inventory
 * CRITICAL: Treads can only rotate 0° or 180° because nose must align with plank's long edge
 */
export function optimizeTreads(
  measurements: StepMeasurement[],
  treadPlanks: PlankSpec[],
  constraints: CuttingConstraints
): {
  layouts: PlankLayout[];
  totalCost: number;
  totalWaste: number;
  allPiecesFit: boolean;
  unfitPieces: Piece[];
} {
  // Filter only planks with nosing
  const validPlanks = treadPlanks.filter(p => p.hasNosing);

  if (validPlanks.length === 0) {
    throw new Error('No planks with nosing available for treads');
  }

  // Create tread pieces from measurements
  const nosingDepth = validPlanks[0].nosingDepth || 30;
  const pieces = createTreadPieces(measurements, nosingDepth);

  // Treads can only rotate 0° or 180° (NOT 90° or 270°)
  // This is because the nose must align with the long edge of the plank
  const allowedRotations = constraints.allowTreadRotation ? [0, 180] : [0];
  const binPacker = createBinPacker(constraints, allowedRotations);

  // Try each plank type and find the most cost-effective solution
  let bestSolution: {
    layouts: PlankLayout[];
    totalCost: number;
    totalWaste: number;
  } | null = null;

  for (const plankSpec of validPlanks) {
    // Adjust effective plank dimensions for nosing
    const effectivePlankSpec = adjustPlankForNosing(plankSpec);
    const maxPlanks = plankSpec.stockQuantity || 20;

    const packingResults = binPacker.packIntoPlanks(
      pieces,
      effectivePlankSpec,
      maxPlanks
    );

    const layouts = convertPackingResultsToLayouts(packingResults, plankSpec);
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
      validPlanks,
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
 * Adjust plank dimensions to account for nosing thickness
 * The nosing reduces the usable depth of the plank
 */
function adjustPlankForNosing(plankSpec: PlankSpec): PlankSpec {
  const nosingDepth = plankSpec.nosingDepth || 30;

  return {
    ...plankSpec,
    // Reduce usable length by nosing depth on both sides
    length: plankSpec.length - (nosingDepth * 2),
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
      effectivePlankSpec: PlankSpec;
    } | null = null;
    let bestPiecesPlaced = 0;

    // Try each plank type
    for (const plankSpec of sortedPlanks) {
      const effectivePlankSpec = adjustPlankForNosing(plankSpec);
      const binPacker = createBinPacker(constraints, allowedRotations);
      const results = binPacker.packIntoPlanks(
        remainingPieces,
        effectivePlankSpec,
        1
      );

      if (results.length > 0 && results[0].placedPieces.length > bestPiecesPlaced) {
        bestPiecesPlaced = results[0].placedPieces.length;
        bestResult = {
          result: results[0],
          plankSpec,
          effectivePlankSpec,
        };
      }
    }

    if (!bestResult || bestPiecesPlaced === 0) {
      break; // No more pieces can be placed
    }

    // Add the best result
    const layout = convertPackingResultToLayout(
      bestResult.result,
      layouts.length,
      bestResult.plankSpec
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
function convertPackingResultsToLayouts(
  results: PackingResult[],
  originalPlankSpec: PlankSpec
): PlankLayout[] {
  return results.map((result, index) =>
    convertPackingResultToLayout(result, index, originalPlankSpec)
  );
}

/**
 * Convert a single packing result to plank layout
 */
function convertPackingResultToLayout(
  result: PackingResult,
  index: number,
  originalPlankSpec: PlankSpec
): PlankLayout {
  return {
    plankSpec: originalPlankSpec, // Use original spec for display/pricing
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

/**
 * Validate that all tread pieces fit within plank constraints
 */
export function validateTreadFit(
  piece: Piece,
  plankSpec: PlankSpec
): { fits: boolean; reason?: string } {
  if (!plankSpec.hasNosing) {
    return { fits: false, reason: 'Plank does not have nosing for treads' };
  }

  const nosingDepth = plankSpec.nosingDepth || 30;
  const effectiveLength = plankSpec.length - nosingDepth * 2;

  // Check if piece fits in plank (with 0° or 180° rotation only)
  const fitsNormal = piece.width <= plankSpec.width && piece.height <= effectiveLength;
  const fitsRotated = piece.width <= effectiveLength && piece.height <= plankSpec.width;

  if (!fitsNormal && !fitsRotated) {
    return {
      fits: false,
      reason: `Piece (${piece.width}x${piece.height}mm) too large for plank (${plankSpec.width}x${effectiveLength}mm effective)`,
    };
  }

  return { fits: true };
}
