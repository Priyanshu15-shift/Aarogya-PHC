export type Language = 'en' | 'hi' | 'te' | 'mr' | 'bn' | 'kn' | 'ta' | 'ml' | 'gu' | 'pa' | 'or';

export interface SymptomRecord {
  date: string;
  symptom: string;
  count: number;
  drugDispensed: string;
  quantity: number;
}

export interface StockInventory {
  [drugName: string]: {
    current: number;
    minRequired: number;
    unit: string;
  };
}

export interface PHCData {
  id: string;
  name: string;
  type: 'PHC' | 'CHC';
  location: string;
  doctorAttendance: number; // Percentage 0 - 100
  bedsTotal: number;
  bedsAvailable: number;
  testKitsAvailable: number; // count
  testKitsMinRequired: number;
  stock: StockInventory;
  rainfallHistory: number[]; // Last 14 days (mm)
  tempHistory: number[]; // Last 14 days (°C)
  symptomHistory: {
    [symptomName: string]: number[]; // Last 14 days of counts
  };
  // Hackathon required fields
  facility_name?: string;
  facility_type?: 'PHC' | 'CHC';
  state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  footfall_count?: number;
  doctor_attended?: 'Yes' | 'No';
  bed_available?: 'Yes' | 'No';
  test_kit_available?: 'Yes' | 'No';
  risk_score?: number;
}

export interface DigitizedRecord {
  date: string;
  symptom: string;
  footfallCount: number;
  drugDispensed: string;
  quantity: number;
}

export interface RedistributionProposal {
  sourcePhcId: string;
  sourcePhcName: string;
  targetPhcId: string;
  targetPhcName: string;
  drugName: string;
  transferQuantity: number;
  reason: string;
  draftText: string;
}

export interface ForecastResult {
  symptom: string;
  currentTrend: 'rising' | 'stable' | 'falling';
  movingAverageSlope: number;
  projectedCount: number; // Projected for next week
  riskScore: number; // 0 - 100
  horizonDays: string; // e.g. "10-14 days"
  reasoning: string;
}

export interface RiskAnalysis {
  phcId: string;
  score: number; // 0 - 100
  status: 'red' | 'amber' | 'green';
  reasons: string[];
}
