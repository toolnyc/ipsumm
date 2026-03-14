export type EnergyRating = 'A' | 'B' | 'C' | 'D' | 'E';

export interface EnergyData {
  modelId: string;
  rating: EnergyRating;
  kwhPerQuery: number;
  analogy: string;
}

export interface BrowserModelEnergy {
  modelId: string;
  rating: 'local';
  kwhPerQuery: 0;
  analogy: string;
}

export type AnyEnergyData = EnergyData | BrowserModelEnergy;

/**
 * Energy data for known models.
 * Ratings based on AI Energy Score research (Luccioni et al.)
 * and relative parameter counts.
 *
 * A = most efficient (small models, <10B params)
 * B = efficient (10-30B params)
 * C = moderate (30-100B params)
 * D = heavy (100-300B params)
 * E = heaviest (300B+ params)
 */
const ENERGY_DATA: Record<string, EnergyData> = {
  'meta-llama/llama-3.2-1b-instruct': {
    modelId: 'meta-llama/llama-3.2-1b-instruct',
    rating: 'A',
    kwhPerQuery: 0.00002,
    analogy: 'like a LED bulb for half a second',
  },
  'microsoft/phi-3-mini-128k-instruct': {
    modelId: 'microsoft/phi-3-mini-128k-instruct',
    rating: 'A',
    kwhPerQuery: 0.00004,
    analogy: 'like a LED bulb for 1 second',
  },
  'anthropic/claude-3-haiku': {
    modelId: 'anthropic/claude-3-haiku',
    rating: 'B',
    kwhPerQuery: 0.0001,
    analogy: 'like charging your phone for 2 seconds',
  },
  'deepseek/deepseek-chat': {
    modelId: 'deepseek/deepseek-chat',
    rating: 'B',
    kwhPerQuery: 0.00015,
    analogy: 'like charging your phone for 3 seconds',
  },
  'meta-llama/llama-3.3-70b-instruct': {
    modelId: 'meta-llama/llama-3.3-70b-instruct',
    rating: 'C',
    kwhPerQuery: 0.001,
    analogy: 'like a light bulb on for 30 seconds',
  },
  'anthropic/claude-3.5-sonnet': {
    modelId: 'anthropic/claude-3.5-sonnet',
    rating: 'D',
    kwhPerQuery: 0.004,
    analogy: 'like running a microwave for 3 seconds',
  },
  'openai/gpt-4o': {
    modelId: 'openai/gpt-4o',
    rating: 'D',
    kwhPerQuery: 0.005,
    analogy: 'like running a microwave for 4 seconds',
  },
  'openai/gpt-4': {
    modelId: 'openai/gpt-4',
    rating: 'E',
    kwhPerQuery: 0.01,
    analogy: 'like running a microwave for 10 seconds',
  },
  'anthropic/claude-3-opus': {
    modelId: 'anthropic/claude-3-opus',
    rating: 'E',
    kwhPerQuery: 0.012,
    analogy: 'like running a microwave for 12 seconds',
  },
};

const BROWSER_MODEL_ENERGY: BrowserModelEnergy = {
  modelId: 'browser-local',
  rating: 'local',
  kwhPerQuery: 0,
  analogy: 'ran on your device — zero cloud energy, zero water',
};

/**
 * Estimate energy rating for unknown models based on approximate parameter count.
 */
function estimateFromParams(modelId: string): EnergyData {
  const lower = modelId.toLowerCase();

  let estimatedParams = 30; // default guess: medium model

  const paramMatch = lower.match(/(\d+)b/);
  if (paramMatch) {
    estimatedParams = parseInt(paramMatch[1], 10);
  }

  let rating: EnergyRating;
  let kwhPerQuery: number;
  let analogy: string;

  if (estimatedParams <= 10) {
    rating = 'A';
    kwhPerQuery = 0.00005;
    analogy = 'like a LED bulb for 1 second (estimated)';
  } else if (estimatedParams <= 30) {
    rating = 'B';
    kwhPerQuery = 0.0002;
    analogy = 'like charging your phone for 4 seconds (estimated)';
  } else if (estimatedParams <= 100) {
    rating = 'C';
    kwhPerQuery = 0.002;
    analogy = 'like a light bulb on for 1 minute (estimated)';
  } else if (estimatedParams <= 300) {
    rating = 'D';
    kwhPerQuery = 0.006;
    analogy = 'like running a microwave for 5 seconds (estimated)';
  } else {
    rating = 'E';
    kwhPerQuery = 0.015;
    analogy = 'like running a microwave for 15 seconds (estimated)';
  }

  return { modelId, rating, kwhPerQuery, analogy };
}

/**
 * Look up energy data for a model. Returns known data or an estimate.
 */
export function getEnergyData(modelId: string): AnyEnergyData {
  if (modelId === 'browser-local') {
    return BROWSER_MODEL_ENERGY;
  }

  return ENERGY_DATA[modelId] ?? estimateFromParams(modelId);
}

/**
 * Get energy data for an in-browser model.
 */
export function getBrowserModelEnergy(): BrowserModelEnergy {
  return BROWSER_MODEL_ENERGY;
}

/**
 * Get all known model energy data.
 */
export function getAllKnownModels(): EnergyData[] {
  return Object.values(ENERGY_DATA);
}
