// ============================================================================
// Validation Utilities
// ============================================================================

import {
  StepMeasurement,
  MeasurementValidation,
  MEASUREMENT_BOUNDS,
  PlankSpec,
} from '../types';

/**
 * Validate a single step measurement
 */
export function validateStepMeasurement(
  measurement: StepMeasurement
): MeasurementValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if all required fields are present and > 0
  const requiredFields: (keyof StepMeasurement)[] = [
    'frontWidth',
    'backWidth',
    'leftDepth',
    'centerDepth',
    'rightDepth',
    'riserHeight',
  ];

  let isComplete = true;

  for (const field of requiredFields) {
    const value = measurement[field] as number;
    if (value === undefined || value === null || value <= 0) {
      errors.push(`${field} is missing or invalid`);
      isComplete = false;
    }
  }

  // If incomplete, return early
  if (!isComplete) {
    return {
      stepNumber: measurement.stepNumber,
      isComplete: false,
      warnings,
      errors,
    };
  }

  // Validate width ranges
  const maxWidth = Math.max(measurement.frontWidth, measurement.backWidth);
  if (maxWidth < MEASUREMENT_BOUNDS.width.min) {
    warnings.push(
      `Width (${maxWidth}mm) is below typical minimum (${MEASUREMENT_BOUNDS.width.min}mm)`
    );
  } else if (maxWidth > MEASUREMENT_BOUNDS.width.max) {
    warnings.push(
      `Width (${maxWidth}mm) exceeds typical maximum (${MEASUREMENT_BOUNDS.width.max}mm)`
    );
  }

  // Validate depth ranges
  const maxDepth = Math.max(
    measurement.leftDepth,
    measurement.centerDepth,
    measurement.rightDepth
  );
  if (maxDepth < MEASUREMENT_BOUNDS.depth.min) {
    warnings.push(
      `Depth (${maxDepth}mm) is below typical minimum (${MEASUREMENT_BOUNDS.depth.min}mm)`
    );
  } else if (maxDepth > MEASUREMENT_BOUNDS.depth.max) {
    warnings.push(
      `Depth (${maxDepth}mm) exceeds typical maximum (${MEASUREMENT_BOUNDS.depth.max}mm)`
    );
  }

  // Validate riser height
  if (measurement.riserHeight < MEASUREMENT_BOUNDS.height.min) {
    warnings.push(
      `Riser height (${measurement.riserHeight}mm) is below typical minimum (${MEASUREMENT_BOUNDS.height.min}mm)`
    );
  } else if (measurement.riserHeight > MEASUREMENT_BOUNDS.height.max) {
    warnings.push(
      `Riser height (${measurement.riserHeight}mm) exceeds typical maximum (${MEASUREMENT_BOUNDS.height.max}mm)`
    );
  }

  // Check for inconsistent measurements
  const widthDiff = Math.abs(measurement.frontWidth - measurement.backWidth);
  if (widthDiff > 50) {
    warnings.push(
      `Large difference between front (${measurement.frontWidth}mm) and back (${measurement.backWidth}mm) widths`
    );
  }

  const depthValues = [
    measurement.leftDepth,
    measurement.centerDepth,
    measurement.rightDepth,
  ];
  const depthRange = Math.max(...depthValues) - Math.min(...depthValues);
  if (depthRange > 30) {
    warnings.push(
      `Significant depth variation (${depthRange}mm) - step may be irregular`
    );
  }

  return {
    stepNumber: measurement.stepNumber,
    isComplete: true,
    warnings,
    errors,
  };
}

/**
 * Validate all measurements in a project
 */
export function validateAllMeasurements(
  measurements: StepMeasurement[]
): MeasurementValidation[] {
  return measurements.map(validateStepMeasurement);
}

/**
 * Check if measurements are complete
 */
export function areMeasurementsComplete(
  validations: MeasurementValidation[]
): boolean {
  return validations.every((v) => v.isComplete && v.errors.length === 0);
}

/**
 * Validate plank specification
 */
export function validatePlankSpec(plank: PlankSpec): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!plank.width || plank.width <= 0) {
    errors.push('Plank width must be greater than 0');
  }

  if (!plank.length || plank.length <= 0) {
    errors.push('Plank length must be greater than 0');
  }

  if (!plank.thickness || plank.thickness <= 0) {
    errors.push('Plank thickness must be greater than 0');
  }

  if (plank.thickness < MEASUREMENT_BOUNDS.thickness.min ||
      plank.thickness > MEASUREMENT_BOUNDS.thickness.max) {
    errors.push(
      `Plank thickness (${plank.thickness}mm) outside typical range (${MEASUREMENT_BOUNDS.thickness.min}-${MEASUREMENT_BOUNDS.thickness.max}mm)`
    );
  }

  if (!plank.pricePerPlank || plank.pricePerPlank < 0) {
    errors.push('Plank price must be 0 or greater');
  }

  if (plank.hasNosing && (!plank.nosingDepth || plank.nosingDepth <= 0)) {
    errors.push('Planks with nosing must have a valid nosing depth');
  }

  if (plank.stockQuantity !== undefined && plank.stockQuantity < 0) {
    errors.push('Stock quantity cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate inventory has necessary planks
 */
export function validateInventory(
  treadPlanks: PlankSpec[],
  riserPlanks: PlankSpec[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check treads
  if (treadPlanks.length === 0) {
    errors.push('No tread planks defined');
  } else {
    const planksWithNosing = treadPlanks.filter((p) => p.hasNosing);
    if (planksWithNosing.length === 0) {
      errors.push('Tread planks must have nosing');
    }

    // Validate each plank
    for (const plank of treadPlanks) {
      const validation = validatePlankSpec(plank);
      if (!validation.isValid) {
        errors.push(
          `Tread plank "${plank.name || plank.id}": ${validation.errors.join(', ')}`
        );
      }
    }
  }

  // Check risers
  if (riserPlanks.length === 0) {
    warnings.push('No riser planks defined');
  } else {
    // Validate each plank
    for (const plank of riserPlanks) {
      const validation = validatePlankSpec(plank);
      if (!validation.isValid) {
        errors.push(
          `Riser plank "${plank.name || plank.id}": ${validation.errors.join(', ')}`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get summary of validation results
 */
export function getValidationSummary(validations: MeasurementValidation[]): {
  totalSteps: number;
  completeSteps: number;
  stepsWithWarnings: number;
  stepsWithErrors: number;
  completionPercentage: number;
} {
  const totalSteps = validations.length;
  const completeSteps = validations.filter((v) => v.isComplete).length;
  const stepsWithWarnings = validations.filter((v) => v.warnings.length > 0).length;
  const stepsWithErrors = validations.filter((v) => v.errors.length > 0).length;
  const completionPercentage =
    totalSteps > 0 ? (completeSteps / totalSteps) * 100 : 0;

  return {
    totalSteps,
    completeSteps,
    stepsWithWarnings,
    stepsWithErrors,
    completionPercentage,
  };
}
