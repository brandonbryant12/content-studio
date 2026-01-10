// Core CRUD operations
export {
  createInfographic,
  type CreateInfographicInput,
} from './create-infographic';

export { getInfographic, type GetInfographicInput } from './get-infographic';

export {
  updateInfographic,
  type UpdateInfographicInput,
} from './update-infographic';

export {
  deleteInfographic,
  type DeleteInfographicInput,
  type DeleteInfographicResult,
} from './delete-infographic';

export {
  listInfographics,
  type ListInfographicsInput,
  type ListInfographicsResult,
} from './list-infographics';

// Selection operations
export {
  addSelection,
  MAX_SELECTION_LENGTH,
  SELECTION_SOFT_LIMIT,
  type AddSelectionInput,
  type AddSelectionResult,
} from './add-selection';

export { removeSelection, type RemoveSelectionInput } from './remove-selection';

export { updateSelection, type UpdateSelectionInput } from './update-selection';

export {
  reorderSelections,
  type ReorderSelectionsInput,
} from './reorder-selections';

// AI-powered operations
export {
  extractKeyPoints,
  type ExtractKeyPointsInput,
  type ExtractKeyPointsResult,
  type KeyPointSuggestion,
} from './extract-key-points';

// Generation operations
export {
  startGeneration,
  type StartGenerationInput,
  type StartGenerationResult,
} from './start-generation';

export {
  generateInfographic,
  type GenerateInfographicInput,
  type GenerateInfographicResult,
} from './generate-infographic';

export { getJob, type GetJobInput, type GetJobResult } from './get-job';
