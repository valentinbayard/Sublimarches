// ============================================================================
// Calculation Utilities
// ============================================================================

import {
  StepMeasurement,
  PlankLayout,
  ShoppingList,
  ShoppingListItem,
  CuttingInstruction,
  OptimizationResult,
  PlacedPiece,
  PlankSpec,
} from '../types';

/**
 * Calculate maximum dimensions for a step
 */
export function calculateStepDimensions(measurement: StepMeasurement): {
  maxWidth: number;
  maxDepth: number;
} {
  const maxWidth = Math.max(measurement.frontWidth, measurement.backWidth);
  const maxDepth = Math.max(
    measurement.leftDepth,
    measurement.centerDepth,
    measurement.rightDepth
  );

  return { maxWidth, maxDepth };
}

/**
 * Update all measurements with calculated max dimensions
 */
export function calculateAllStepDimensions(
  measurements: StepMeasurement[]
): StepMeasurement[] {
  return measurements.map((m) => {
    const { maxWidth, maxDepth } = calculateStepDimensions(m);
    return {
      ...m,
      maxWidth,
      maxDepth,
    };
  });
}

/**
 * Generate shopping list from optimization results
 */
export function generateShoppingList(
  optimizationResult: OptimizationResult
): ShoppingList {
  const items: ShoppingListItem[] = [];

  // Count planks by spec
  const plankCounts = new Map<string, { spec: PlankSpec; count: number; purpose: string }>();

  // Process tread layouts
  for (const layout of optimizationResult.treadLayouts) {
    const key = layout.plankSpec.id;
    if (plankCounts.has(key)) {
      plankCounts.get(key)!.count++;
    } else {
      plankCounts.set(key, {
        spec: layout.plankSpec,
        count: 1,
        purpose: 'Marches (Treads)',
      });
    }
  }

  // Process riser layouts
  for (const layout of optimizationResult.riserLayouts) {
    const key = layout.plankSpec.id;
    if (plankCounts.has(key)) {
      plankCounts.get(key)!.count++;
    } else {
      plankCounts.set(key, {
        spec: layout.plankSpec,
        count: 1,
        purpose: 'Contremarches (Risers)',
      });
    }
  }

  // Convert to shopping list items
  plankCounts.forEach(({ spec, count, purpose }) => {
    items.push({
      plankSpec: spec,
      quantity: count,
      unitPrice: spec.pricePerPlank,
      totalPrice: spec.pricePerPlank * count,
      purpose,
    });
  });

  // Calculate totals
  const grandTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    items,
    grandTotal,
    estimatedWaste: optimizationResult.overallEfficiency
      ? 100 - optimizationResult.overallEfficiency
      : 0,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate cutting instructions from optimization results
 */
export function generateCuttingInstructions(
  optimizationResult: OptimizationResult
): CuttingInstruction[] {
  const instructions: CuttingInstruction[] = [];
  let instructionNumber = 1;

  // Process tread layouts
  for (const layout of optimizationResult.treadLayouts) {
    for (const piece of layout.placedPieces) {
      instructions.push(createCuttingInstruction(
        piece,
        layout.plankSpec,
        layout.plankIndex,
        instructionNumber++
      ));
    }
  }

  // Process riser layouts
  for (const layout of optimizationResult.riserLayouts) {
    for (const piece of layout.placedPieces) {
      instructions.push(createCuttingInstruction(
        piece,
        layout.plankSpec,
        layout.plankIndex,
        instructionNumber++
      ));
    }
  }

  // Sort by step number for easier workshop flow
  instructions.sort((a, b) => a.stepNumber - b.stepNumber);

  return instructions;
}

/**
 * Create a single cutting instruction
 */
function createCuttingInstruction(
  piece: PlacedPiece,
  plankSpec: PlankSpec,
  plankIndex: number,
  instructionNumber: number
): CuttingInstruction {
  const notes: string[] = [];

  // Add rotation info
  if (piece.rotation !== 0) {
    notes.push(`Rotate ${piece.rotation}° before cutting`);
  }

  // Add nose orientation for treads
  if (piece.type === 'tread' && plankSpec.hasNosing) {
    const noseEdge = piece.rotation === 0 || piece.rotation === 180
      ? 'long edge'
      : 'short edge';
    notes.push(`Nose on ${noseEdge}`);
  }

  // Add safety reminder for first cut
  if (instructionNumber === 1) {
    notes.push('Safety: Wear protective equipment');
  }

  return {
    stepNumber: piece.stepNumber,
    instructionNumber,
    plankId: plankSpec.id,
    plankIndex,
    pieceType: piece.type,
    width: piece.width,
    height: piece.height,
    rotation: piece.rotation,
    noseOrientation: piece.type === 'tread' && plankSpec.hasNosing
      ? getNoseOrientation(piece.rotation)
      : undefined,
    position: { x: piece.x, y: piece.y },
    notes: notes.length > 0 ? notes : undefined,
  };
}

/**
 * Get nose orientation description based on rotation
 */
function getNoseOrientation(rotation: number): string {
  switch (rotation) {
    case 0:
      return 'Front edge';
    case 90:
      return 'Right edge';
    case 180:
      return 'Back edge';
    case 270:
      return 'Left edge';
    default:
      return 'Unknown';
  }
}

/**
 * Calculate overall statistics from layouts
 */
export function calculateOptimizationStats(
  treadLayouts: PlankLayout[],
  riserLayouts: PlankLayout[]
): {
  totalPlanks: number;
  totalCost: number;
  totalArea: number;
  totalWaste: number;
  overallEfficiency: number;
  treadStats: { planks: number; cost: number; efficiency: number };
  riserStats: { planks: number; cost: number; efficiency: number };
} {
  const treadPlanks = treadLayouts.length;
  const riserPlanks = riserLayouts.length;
  const totalPlanks = treadPlanks + riserPlanks;

  const treadCost = treadLayouts.reduce((sum, l) => sum + l.plankSpec.pricePerPlank, 0);
  const riserCost = riserLayouts.reduce((sum, l) => sum + l.plankSpec.pricePerPlank, 0);
  const totalCost = treadCost + riserCost;

  const treadArea = treadLayouts.reduce((sum, l) => sum + l.totalArea, 0);
  const riserArea = riserLayouts.reduce((sum, l) => sum + l.totalArea, 0);
  const totalArea = treadArea + riserArea;

  const treadWaste = treadLayouts.reduce((sum, l) => sum + l.wasteArea, 0);
  const riserWaste = riserLayouts.reduce((sum, l) => sum + l.wasteArea, 0);
  const totalWaste = treadWaste + riserWaste;

  const overallEfficiency = totalArea > 0
    ? ((totalArea - totalWaste) / totalArea) * 100
    : 0;

  const treadEfficiency = treadArea > 0
    ? ((treadArea - treadWaste) / treadArea) * 100
    : 0;

  const riserEfficiency = riserArea > 0
    ? ((riserArea - riserWaste) / riserArea) * 100
    : 0;

  return {
    totalPlanks,
    totalCost,
    totalArea,
    totalWaste,
    overallEfficiency,
    treadStats: {
      planks: treadPlanks,
      cost: treadCost,
      efficiency: treadEfficiency,
    },
    riserStats: {
      planks: riserPlanks,
      cost: riserCost,
      efficiency: riserEfficiency,
    },
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = '€'): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Format dimensions for display
 */
export function formatDimensions(
  width: number,
  height: number,
  unit: string = 'mm'
): string {
  return `${width} × ${height} ${unit}`;
}

/**
 * Format area for display
 */
export function formatArea(area: number, unit: string = 'mm²'): string {
  // Convert to m² if area is large
  if (area > 1000000) {
    return `${(area / 1000000).toFixed(2)} m²`;
  }
  return `${area.toFixed(0)} ${unit}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
