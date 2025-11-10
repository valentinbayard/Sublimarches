// ============================================================================
// 2D Bin Packing Algorithm - Guillotine Method with Improvements
// ============================================================================

import { Piece, PlacedPiece, PlankSpec, CuttingConstraints } from '../types';

/**
 * Represents a free rectangle within a plank
 */
interface FreeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Result of attempting to pack pieces into a single plank
 */
export interface PackingResult {
  plankSpec: PlankSpec;
  plankIndex: number;
  placedPieces: PlacedPiece[];
  efficiency: number;
  wasteArea: number;
  totalArea: number;
  freeRectangles: FreeRectangle[];
}

/**
 * Configuration for packing algorithm
 */
interface PackingConfig {
  allowedRotations: number[]; // e.g., [0, 90] or [0, 180]
  sawBladeKerf: number;
  safetyMargin: number;
}

/**
 * Main bin packing class using guillotine algorithm
 */
export class BinPacker {
  private config: PackingConfig;

  constructor(config: PackingConfig) {
    this.config = config;
  }

  /**
   * Pack multiple pieces into multiple planks of the same type
   */
  packIntoPlanks(
    pieces: Piece[],
    plankSpec: PlankSpec,
    maxPlanks: number = 10
  ): PackingResult[] {
    const results: PackingResult[] = [];
    const remainingPieces = [...pieces];
    let plankIndex = 0;

    // Sort pieces by area (largest first) for better packing
    remainingPieces.sort((a, b) => b.area - a.area);

    while (remainingPieces.length > 0 && plankIndex < maxPlanks) {
      const result = this.packIntoSinglePlank(
        remainingPieces,
        plankSpec,
        plankIndex
      );

      results.push(result);

      // Remove successfully placed pieces from remaining
      const placedIds = new Set(result.placedPieces.map(p => p.id));
      remainingPieces.splice(
        0,
        remainingPieces.length,
        ...remainingPieces.filter(p => !placedIds.has(p.id))
      );

      plankIndex++;

      // If no pieces were placed, break to avoid infinite loop
      if (result.placedPieces.length === 0) {
        break;
      }
    }

    return results;
  }

  /**
   * Pack pieces into a single plank
   */
  private packIntoSinglePlank(
    pieces: Piece[],
    plankSpec: PlankSpec,
    plankIndex: number
  ): PackingResult {
    const placedPieces: PlacedPiece[] = [];
    const freeRectangles: FreeRectangle[] = [
      {
        x: 0,
        y: 0,
        width: plankSpec.width,
        height: plankSpec.length,
      },
    ];

    const totalArea = plankSpec.width * plankSpec.length;

    // Try to place each piece
    for (const piece of pieces) {
      const placement = this.findBestPlacement(piece, freeRectangles, plankSpec);

      if (placement) {
        placedPieces.push(placement);
        this.updateFreeRectangles(freeRectangles, placement);
      }
    }

    // Calculate efficiency
    const usedArea = placedPieces.reduce((sum, p) => sum + p.area, 0);
    const efficiency = (usedArea / totalArea) * 100;
    const wasteArea = totalArea - usedArea;

    return {
      plankSpec,
      plankIndex,
      placedPieces,
      efficiency,
      wasteArea,
      totalArea,
      freeRectangles,
    };
  }

  /**
   * Find the best placement for a piece within available free rectangles
   */
  private findBestPlacement(
    piece: Piece,
    freeRectangles: FreeRectangle[],
    plankSpec: PlankSpec
  ): PlacedPiece | null {
    let bestPlacement: PlacedPiece | null = null;
    let bestScore = Infinity;

    for (const rect of freeRectangles) {
      for (const rotation of this.config.allowedRotations) {
        const placement = this.tryPlacement(piece, rect, rotation, plankSpec);

        if (placement) {
          // Score based on waste and position (prefer bottom-left)
          const wasteWidth = rect.width - placement.width;
          const wasteHeight = rect.height - placement.height;
          const score = Math.min(wasteWidth, wasteHeight) +
                       (placement.x + placement.y) * 0.1;

          if (score < bestScore) {
            bestScore = score;
            bestPlacement = placement;
          }
        }
      }
    }

    return bestPlacement;
  }

  /**
   * Try to place a piece in a specific rectangle with a specific rotation
   */
  private tryPlacement(
    piece: Piece,
    rect: FreeRectangle,
    rotation: number,
    plankSpec: PlankSpec
  ): PlacedPiece | null {
    const { width, height } = this.getRotatedDimensions(piece, rotation);

    // Add cutting allowances
    const totalWidth = width + this.config.sawBladeKerf + this.config.safetyMargin;
    const totalHeight = height + this.config.sawBladeKerf + this.config.safetyMargin;

    // Check if piece fits in rectangle
    if (totalWidth <= rect.width && totalHeight <= rect.height) {
      // For treads with nosing, additional validation
      if (piece.type === 'tread' && piece.requiresNose) {
        const isValidNosePlacement = this.validateNosePlacement(
          rotation,
          plankSpec
        );
        if (!isValidNosePlacement) {
          return null;
        }
      }

      return {
        ...piece,
        x: rect.x,
        y: rect.y,
        rotation: rotation as 0 | 90 | 180 | 270,
        plankId: plankSpec.id,
        width,
        height,
      };
    }

    return null;
  }

  /**
   * Validate that nose placement aligns with plank's long edge
   */
  private validateNosePlacement(
    rotation: number,
    plankSpec: PlankSpec
  ): boolean {
    // For treads, nose must align with long edge of plank
    // Only 0° and 180° rotations are allowed for treads with nosing
    if (!plankSpec.hasNosing) {
      return false;
    }

    return rotation === 0 || rotation === 180;
  }

  /**
   * Get dimensions after rotation
   */
  private getRotatedDimensions(
    piece: Piece,
    rotation: number
  ): { width: number; height: number } {
    if (rotation === 90 || rotation === 270) {
      return { width: piece.height, height: piece.width };
    }
    return { width: piece.width, height: piece.height };
  }

  /**
   * Update free rectangles after placing a piece (Guillotine split)
   */
  private updateFreeRectangles(
    freeRectangles: FreeRectangle[],
    placedPiece: PlacedPiece
  ): void {
    const newRectangles: FreeRectangle[] = [];

    const pieceWidth = placedPiece.width +
                      this.config.sawBladeKerf +
                      this.config.safetyMargin;
    const pieceHeight = placedPiece.height +
                       this.config.sawBladeKerf +
                       this.config.safetyMargin;

    for (let i = 0; i < freeRectangles.length; i++) {
      const rect = freeRectangles[i];

      // Check if this rectangle contains the placed piece
      if (
        placedPiece.x >= rect.x &&
        placedPiece.y >= rect.y &&
        placedPiece.x + pieceWidth <= rect.x + rect.width &&
        placedPiece.y + pieceHeight <= rect.y + rect.height
      ) {
        // Split the rectangle using guillotine method
        // Create horizontal split
        if (placedPiece.x + pieceWidth < rect.x + rect.width) {
          newRectangles.push({
            x: placedPiece.x + pieceWidth,
            y: rect.y,
            width: rect.width - (placedPiece.x + pieceWidth - rect.x),
            height: rect.height,
          });
        }

        // Create vertical split
        if (placedPiece.y + pieceHeight < rect.y + rect.height) {
          newRectangles.push({
            x: rect.x,
            y: placedPiece.y + pieceHeight,
            width: rect.width,
            height: rect.height - (placedPiece.y + pieceHeight - rect.y),
          });
        }

        // Remove the original rectangle
        freeRectangles.splice(i, 1);
        i--;
      }
    }

    // Add new rectangles
    freeRectangles.push(...newRectangles);

    // Merge overlapping rectangles to reduce fragmentation
    this.mergeFreeRectangles(freeRectangles);
  }

  /**
   * Merge overlapping free rectangles to reduce fragmentation
   */
  private mergeFreeRectangles(rectangles: FreeRectangle[]): void {
    // Simple merge: remove completely contained rectangles
    for (let i = 0; i < rectangles.length; i++) {
      for (let j = i + 1; j < rectangles.length; j++) {
        if (this.isContained(rectangles[i], rectangles[j])) {
          rectangles.splice(i, 1);
          i--;
          break;
        } else if (this.isContained(rectangles[j], rectangles[i])) {
          rectangles.splice(j, 1);
          j--;
        }
      }
    }
  }

  /**
   * Check if rect1 is completely contained within rect2
   */
  private isContained(rect1: FreeRectangle, rect2: FreeRectangle): boolean {
    return (
      rect1.x >= rect2.x &&
      rect1.y >= rect2.y &&
      rect1.x + rect1.width <= rect2.x + rect2.width &&
      rect1.y + rect1.height <= rect2.y + rect2.height
    );
  }
}

/**
 * Helper function to create a bin packer with standard constraints
 */
export function createBinPacker(
  constraints: CuttingConstraints,
  allowedRotations: number[]
): BinPacker {
  return new BinPacker({
    allowedRotations,
    sawBladeKerf: constraints.sawBladeKerf,
    safetyMargin: constraints.safetyMargin,
  });
}
