import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { PHCData, DigitizedRecord, ForecastResult, RiskAnalysis, RedistributionProposal } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini API client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("GoogleGenAI initialized successfully server-side.");
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
  }
} else {
  console.log("No valid GEMINI_API_KEY environment variable found. Operating in Simulation Mode.");
}

// Global SEED Database for Uttar Pradesh
const SEED_PHCS: PHCData[] = [
  {
    id: "malihabad",
    name: "Malihabad PHC",
    type: "PHC",
    location: "Lucknow District North-West",
    doctorAttendance: 95,
    bedsTotal: 20,
    bedsAvailable: 2,
    testKitsAvailable: 12,
    testKitsMinRequired: 50,
    stock: {
      "Paracetamol": { current: 15, minRequired: 150, unit: "Tablets" },
      "ORS Packets": { current: 120, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 80, minRequired: 50, unit: "Vials" },
      "Doxycycline": { current: 40, minRequired: 50, unit: "Capsules" }
    },
    rainfallHistory: [2, 1, 0, 0, 0, 42, 5, 1, 0, 0, 2, 0, 0, 0],
    tempHistory: [31, 32, 33, 31, 29, 26, 28, 30, 31, 32, 33, 34, 33, 32],
    symptomHistory: {
      "Fever": [12, 14, 15, 11, 9, 8, 15, 22, 29, 36, 42, 48, 55, 62],
      "Diarrhea": [4, 5, 3, 2, 4, 3, 5, 4, 6, 5, 4, 3, 5, 4],
      "Malaria": [1, 0, 1, 0, 0, 0, 2, 3, 5, 8, 11, 14, 18, 22],
      "Rash": [2, 1, 1, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
    }
  },
  {
    id: "mohanlalganj",
    name: "Mohanlalganj CHC",
    type: "CHC",
    location: "Lucknow District South",
    doctorAttendance: 55,
    bedsTotal: 100,
    bedsAvailable: 12,
    testKitsAvailable: 60,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 350, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 8, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 15, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 65, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 12, 15, 2, 0, 0, 0, 0, 1, 0, 0],
    tempHistory: [33, 34, 35, 33, 32, 31, 32, 33, 34, 35, 36, 35, 34, 35],
    symptomHistory: {
      "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
      "Diarrhea": [15, 18, 20, 22, 25, 29, 32, 38, 45, 52, 60, 68, 75, 84],
      "Malaria": [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
      "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
    }
  },
  {
    id: "chinhat",
    name: "Chinhat PHC",
    type: "PHC",
    location: "Lucknow District East",
    doctorAttendance: 85,
    bedsTotal: 15,
    bedsAvailable: 0,
    testKitsAvailable: 8,
    testKitsMinRequired: 30,
    stock: {
      "Paracetamol": { current: 180, minRequired: 80, unit: "Tablets" },
      "ORS Packets": { current: 150, minRequired: 80, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 6, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 12, minRequired: 25, unit: "Capsules" }
    },
    rainfallHistory: [1, 1, 2, 5, 8, 4, 1, 0, 0, 2, 1, 0, 0, 0],
    tempHistory: [32, 31, 30, 29, 28, 29, 31, 32, 33, 34, 35, 34, 33, 32],
    symptomHistory: {
      "Fever": [5, 6, 8, 7, 9, 11, 14, 16, 19, 21, 24, 28, 31, 35],
      "Diarrhea": [3, 2, 4, 2, 3, 5, 4, 3, 5, 4, 3, 2, 3, 2],
      "Malaria": [4, 6, 7, 5, 8, 9, 12, 15, 18, 22, 27, 32, 38, 45],
      "Rash": [0, 1, 1, 0, 1, 0, 0, 1, 2, 1, 2, 3, 2, 4]
    }
  },
  {
    id: "cholapur",
    name: "Cholapur PHC",
    type: "PHC",
    location: "Varanasi District North",
    doctorAttendance: 98,
    bedsTotal: 12,
    bedsAvailable: 8,
    testKitsAvailable: 45,
    testKitsMinRequired: 30,
    stock: {
      "Paracetamol": { current: 200, minRequired: 80, unit: "Tablets" },
      "ORS Packets": { current: 120, minRequired: 80, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 35, minRequired: 20, unit: "Vials" },
      "Doxycycline": { current: 50, minRequired: 20, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    tempHistory: [34, 35, 36, 35, 34, 33, 34, 35, 36, 37, 36, 35, 34, 35],
    symptomHistory: {
      "Fever": [5, 4, 6, 5, 3, 4, 5, 6, 5, 4, 6, 5, 4, 5],
      "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
      "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
    }
  },
  {
    id: "pindra",
    name: "Pindra CHC",
    type: "CHC",
    location: "Varanasi District West",
    doctorAttendance: 75,
    bedsTotal: 50,
    bedsAvailable: 35,
    testKitsAvailable: 15,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 110, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 85, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 8, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 15, minRequired: 35, unit: "Capsules" }
    },
    rainfallHistory: [1, 2, 0, 0, 4, 15, 18, 5, 2, 1, 0, 0, 0, 0],
    tempHistory: [31, 32, 31, 30, 29, 28, 29, 31, 32, 33, 34, 33, 32, 31],
    symptomHistory: {
      "Fever": [6, 8, 7, 9, 12, 15, 18, 22, 26, 31, 36, 42, 48, 54],
      "Diarrhea": [4, 3, 5, 4, 3, 5, 6, 5, 4, 5, 4, 5, 4, 5],
      "Malaria": [2, 1, 3, 2, 4, 6, 7, 9, 11, 13, 16, 19, 22, 26],
      "Rash": [10, 12, 14, 16, 18, 22, 25, 29, 34, 39, 44, 50, 56, 62]
    }
  },
  {
    id: "kashi_vidya",
    name: "Kashi Vidyapeeth PHC",
    type: "PHC",
    location: "Varanasi District South",
    doctorAttendance: 96,
    bedsTotal: 15,
    bedsAvailable: 11,
    testKitsAvailable: 180,
    testKitsMinRequired: 100,
    stock: {
      "Paracetamol": { current: 400, minRequired: 200, unit: "Tablets" },
      "ORS Packets": { current: 300, minRequired: 150, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 90, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 110, minRequired: 50, unit: "Capsules" }
    },
    rainfallHistory: [0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0],
    tempHistory: [33, 34, 34, 33, 32, 33, 34, 33, 34, 35, 34, 33, 32, 33],
    symptomHistory: {
      "Fever": [10, 11, 9, 10, 8, 9, 11, 10, 9, 11, 10, 9, 11, 10],
      "Diarrhea": [3, 4, 2, 3, 4, 2, 3, 4, 3, 2, 3, 4, 3, 2],
      "Malaria": [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
      "Rash": [2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
    }
  },
  {
    id: "campierganj",
    name: "Campierganj PHC",
    type: "PHC",
    location: "Gorakhpur District North-West",
    doctorAttendance: 48,
    bedsTotal: 10,
    bedsAvailable: 4,
    testKitsAvailable: 15,
    testKitsMinRequired: 35,
    stock: {
      "Paracetamol": { current: 12, minRequired: 80, unit: "Tablets" },
      "ORS Packets": { current: 20, minRequired: 60, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 8, minRequired: 25, unit: "Vials" },
      "Doxycycline": { current: 35, minRequired: 20, unit: "Capsules" }
    },
    rainfallHistory: [5, 2, 1, 0, 4, 8, 12, 18, 5, 2, 0, 0, 0, 0],
    tempHistory: [30, 31, 31, 30, 29, 29, 30, 31, 32, 31, 30, 31, 32, 31],
    symptomHistory: {
      "Fever": [5, 6, 8, 11, 14, 18, 22, 28, 35, 42, 50, 58, 67, 78],
      "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
      "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
    }
  },
  {
    id: "pipraich",
    name: "Pipraich CHC",
    type: "CHC",
    location: "Gorakhpur District East",
    doctorAttendance: 82,
    bedsTotal: 30,
    bedsAvailable: 1,
    testKitsAvailable: 40,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 150, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 95, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 30, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 40, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 1, 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    tempHistory: [32, 33, 33, 32, 31, 32, 33, 34, 34, 33, 32, 33, 34, 33],
    symptomHistory: {
      "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
      "Diarrhea": [4, 5, 6, 5, 7, 8, 11, 14, 18, 23, 29, 36, 44, 53],
      "Malaria": [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
      "Rash": [2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
    }
  },
  {
    id: "bhathat",
    name: "Bhathat PHC",
    type: "PHC",
    location: "Gorakhpur District North",
    doctorAttendance: 92,
    bedsTotal: 15,
    bedsAvailable: 12,
    testKitsAvailable: 25,
    testKitsMinRequired: 80,
    stock: {
      "Paracetamol": { current: 320, minRequired: 200, unit: "Tablets" },
      "ORS Packets": { current: 240, minRequired: 150, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 15, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 45, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [1, 0, 0, 0, 2, 5, 1, 0, 0, 0, 0, 1, 0, 0],
    tempHistory: [33, 34, 35, 34, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
    symptomHistory: {
      "Fever": [15, 18, 16, 20, 24, 29, 35, 42, 50, 59, 69, 80, 92, 105],
      "Diarrhea": [6, 8, 7, 9, 11, 13, 12, 14, 15, 16, 17, 18, 19, 21],
      "Malaria": [2, 1, 3, 2, 4, 6, 7, 9, 11, 13, 16, 19, 22, 26],
      "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
    }
  },
  {
    id: "fatehabad",
    name: "Fatehabad PHC",
    type: "PHC",
    location: "Agra District East",
    doctorAttendance: 88,
    bedsTotal: 10,
    bedsAvailable: 6,
    testKitsAvailable: 55,
    testKitsMinRequired: 30,
    stock: {
      "Paracetamol": { current: 110, minRequired: 70, unit: "Tablets" },
      "ORS Packets": { current: 85, minRequired: 70, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 5, minRequired: 25, unit: "Vials" },
      "Doxycycline": { current: 15, minRequired: 20, unit: "Capsules" }
    },
    rainfallHistory: [10, 12, 15, 8, 20, 25, 35, 12, 8, 5, 2, 1, 0, 0],
    tempHistory: [28, 27, 28, 29, 28, 27, 28, 29, 30, 31, 30, 29, 28, 29],
    symptomHistory: {
      "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
      "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
      "Malaria": [2, 3, 4, 3, 6, 8, 11, 15, 20, 26, 33, 41, 50, 60],
      "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
    }
  },
  {
    id: "achhnera",
    name: "Achhnera CHC",
    type: "CHC",
    location: "Agra District West",
    doctorAttendance: 78,
    bedsTotal: 40,
    bedsAvailable: 2,
    testKitsAvailable: 30,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 5, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 120, minRequired: 80, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 40, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 65, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 1, 0, 0],
    tempHistory: [34, 35, 36, 35, 34, 33, 34, 35, 36, 37, 36, 35, 34, 35],
    symptomHistory: {
      "Fever": [12, 14, 15, 13, 16, 18, 22, 27, 33, 40, 48, 57, 68, 80],
      "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
      "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
    }
  },
  {
    id: "pinahat",
    name: "Pinahat PHC",
    type: "PHC",
    location: "Agra District South",
    doctorAttendance: 90,
    bedsTotal: 15,
    bedsAvailable: 11,
    testKitsAvailable: 70,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 220, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 180, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 55, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 40, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 1, 1, 2, 0, 0, 0, 0, 1, 0, 0, 0],
    tempHistory: [32, 33, 34, 33, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
    symptomHistory: {
      "Fever": [5, 4, 6, 5, 3, 4, 5, 6, 5, 4, 6, 5, 4, 5],
      "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
      "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      "Rash": [2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
    }
  },
  {
    id: "kalyanpur",
    name: "Kalyanpur PHC",
    type: "PHC",
    location: "Kanpur Nagar District North",
    doctorAttendance: 65,
    bedsTotal: 12,
    bedsAvailable: 8,
    testKitsAvailable: 35,
    testKitsMinRequired: 30,
    stock: {
      "Paracetamol": { current: 110, minRequired: 80, unit: "Tablets" },
      "ORS Packets": { current: 0, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 12, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 8, minRequired: 25, unit: "Capsules" }
    },
    rainfallHistory: [2, 4, 5, 2, 8, 10, 14, 6, 2, 1, 0, 0, 0, 0],
    tempHistory: [31, 32, 31, 30, 29, 28, 29, 31, 32, 33, 34, 33, 32, 31],
    symptomHistory: {
      "Fever": [6, 8, 7, 9, 12, 15, 18, 22, 26, 31, 36, 42, 48, 54],
      "Diarrhea": [10, 12, 15, 18, 22, 27, 33, 40, 48, 57, 68, 80, 93, 108],
      "Malaria": [2, 1, 3, 2, 4, 6, 7, 9, 11, 13, 16, 19, 22, 26],
      "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
    }
  },
  {
    id: "bidhnu",
    name: "Bidhnu CHC",
    type: "CHC",
    location: "Kanpur Nagar District South",
    doctorAttendance: 80,
    bedsTotal: 50,
    bedsAvailable: 0,
    testKitsAvailable: 28,
    testKitsMinRequired: 30,
    stock: {
      "Paracetamol": { current: 180, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 150, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 35, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 2, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    tempHistory: [33, 34, 35, 34, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
    symptomHistory: {
      "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
      "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
      "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      "Rash": [4, 6, 8, 11, 15, 20, 26, 33, 41, 50, 60, 71, 83, 96]
    }
  },
  {
    id: "sarsaul",
    name: "Sarsaul PHC",
    type: "PHC",
    location: "Kanpur Nagar District East",
    doctorAttendance: 87,
    bedsTotal: 14,
    bedsAvailable: 5,
    testKitsAvailable: 60,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 160, minRequired: 90, unit: "Tablets" },
      "ORS Packets": { current: 130, minRequired: 90, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 6, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 45, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [4, 8, 12, 15, 6, 2, 1, 0, 0, 0, 1, 0, 0, 0],
    tempHistory: [31, 30, 29, 28, 29, 31, 32, 33, 34, 33, 32, 31, 32, 31],
    symptomHistory: {
      "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
      "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
      "Malaria": [1, 2, 3, 5, 8, 12, 17, 23, 30, 38, 47, 57, 68, 80],
      "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
    }
  },
  // ==================== BIHAR ====================
  {
    id: "phulwari_sharif",
    name: "Phulwari Sharif PHC",
    type: "PHC",
    location: "Patna District South-West",
    doctorAttendance: 90,
    bedsTotal: 25,
    bedsAvailable: 2,
    testKitsAvailable: 15,
    testKitsMinRequired: 60,
    stock: {
      "Paracetamol": { current: 180, minRequired: 150, unit: "Tablets" },
      "ORS Packets": { current: 15, minRequired: 120, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 30, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 45, minRequired: 50, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tempHistory: [36, 37, 38, 37, 36, 35, 36, 37, 38, 39, 38, 37, 36, 37],
    symptomHistory: {
      "Fever": [10, 12, 11, 13, 12, 11, 10, 12, 11, 13, 12, 11, 10, 11],
      "Diarrhea": [18, 22, 25, 29, 34, 40, 48, 57, 68, 80, 93, 108, 124, 142],
      "Malaria": [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      "Rash": [1, 2, 0, 1, 1, 2, 0, 1, 1, 2, 0, 1, 1, 2]
    }
  },
  {
    id: "musahri",
    name: "Musahri PHC",
    type: "PHC",
    location: "Muzaffarpur District East",
    doctorAttendance: 85,
    bedsTotal: 20,
    bedsAvailable: 8,
    testKitsAvailable: 55,
    testKitsMinRequired: 50,
    stock: {
      "Paracetamol": { current: 210, minRequired: 120, unit: "Tablets" },
      "ORS Packets": { current: 180, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 35, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 40, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [2, 4, 1, 0, 0, 15, 4, 1, 0, 0, 0, 0, 0, 0],
    tempHistory: [32, 33, 34, 32, 31, 30, 31, 32, 33, 34, 33, 32, 33, 32],
    symptomHistory: {
      "Fever": [12, 13, 11, 12, 10, 11, 12, 13, 12, 11, 12, 13, 12, 11],
      "Diarrhea": [6, 7, 5, 6, 4, 5, 6, 7, 6, 5, 6, 7, 6, 5],
      "Malaria": [2, 1, 3, 2, 4, 6, 9, 13, 18, 24, 31, 39, 48, 58],
      "Rash": [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1]
    }
  },
  // ==================== GUJARAT ====================
  {
    id: "sanand",
    name: "Sanand PHC",
    type: "PHC",
    location: "Ahmedabad District West",
    doctorAttendance: 94,
    bedsTotal: 20,
    bedsAvailable: 12,
    testKitsAvailable: 70,
    testKitsMinRequired: 50,
    stock: {
      "Paracetamol": { current: 250, minRequired: 120, unit: "Tablets" },
      "ORS Packets": { current: 180, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 45, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 60, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0],
    tempHistory: [34, 35, 36, 35, 34, 33, 34, 35, 36, 37, 36, 35, 34, 35],
    symptomHistory: {
      "Fever": [6, 7, 5, 6, 4, 5, 6, 7, 6, 5, 6, 7, 6, 5],
      "Diarrhea": [4, 5, 3, 4, 2, 3, 4, 5, 4, 3, 4, 5, 4, 3],
      "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      "Rash": [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
    }
  },
  {
    id: "viramgam",
    name: "Viramgam CHC",
    type: "CHC",
    location: "Ahmedabad District North",
    doctorAttendance: 82,
    bedsTotal: 60,
    bedsAvailable: 4,
    testKitsAvailable: 25,
    testKitsMinRequired: 80,
    stock: {
      "Paracetamol": { current: 150, minRequired: 200, unit: "Tablets" },
      "ORS Packets": { current: 130, minRequired: 120, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 8, minRequired: 60, unit: "Vials" },
      "Doxycycline": { current: 35, minRequired: 50, unit: "Capsules" }
    },
    rainfallHistory: [10, 12, 15, 22, 5, 3, 1, 0, 0, 0, 1, 0, 0, 0],
    tempHistory: [29, 28, 27, 26, 28, 30, 31, 32, 33, 32, 31, 30, 31, 30],
    symptomHistory: {
      "Fever": [15, 18, 16, 19, 23, 28, 35, 44, 55, 68, 83, 100, 119, 140],
      "Diarrhea": [5, 6, 4, 5, 3, 4, 5, 6, 5, 4, 5, 6, 5, 4],
      "Malaria": [4, 6, 5, 7, 10, 14, 19, 26, 35, 46, 59, 74, 91, 110],
      "Rash": [2, 1, 1, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
    }
  },
  // ==================== HARYANA ====================
  {
    id: "sohna",
    name: "Sohna CHC",
    type: "CHC",
    location: "Gurugram District South",
    doctorAttendance: 80,
    bedsTotal: 35,
    bedsAvailable: 2,
    testKitsAvailable: 15,
    testKitsMinRequired: 60,
    stock: {
      "Paracetamol": { current: 35, minRequired: 150, unit: "Tablets" },
      "ORS Packets": { current: 160, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 40, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 30, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tempHistory: [38, 39, 40, 39, 38, 37, 38, 39, 40, 41, 40, 39, 38, 39],
    symptomHistory: {
      "Fever": [20, 24, 28, 33, 39, 46, 54, 63, 73, 84, 96, 109, 123, 138],
      "Diarrhea": [6, 7, 5, 6, 4, 5, 6, 7, 6, 5, 6, 7, 6, 5],
      "Malaria": [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
      "Rash": [2, 1, 1, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
    }
  },
  {
    id: "farrukhnagar",
    name: "Farrukhnagar PHC",
    type: "PHC",
    location: "Gurugram District West",
    doctorAttendance: 90,
    bedsTotal: 15,
    bedsAvailable: 10,
    testKitsAvailable: 50,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 180, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 120, minRequired: 80, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 30, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 45, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    tempHistory: [35, 36, 37, 36, 35, 34, 35, 36, 37, 38, 37, 36, 35, 36],
    symptomHistory: {
      "Fever": [5, 6, 7, 5, 4, 5, 6, 5, 4, 5, 6, 5, 4, 5],
      "Diarrhea": [3, 4, 2, 3, 1, 2, 3, 4, 3, 2, 3, 4, 3, 2],
      "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      "Rash": [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
    }
  },
  // ==================== ASSAM ====================
  {
    id: "hajo",
    name: "Hajo PHC",
    type: "PHC",
    location: "Kamrup District North",
    doctorAttendance: 86,
    bedsTotal: 20,
    bedsAvailable: 3,
    testKitsAvailable: 10,
    testKitsMinRequired: 50,
    stock: {
      "Paracetamol": { current: 190, minRequired: 150, unit: "Tablets" },
      "ORS Packets": { current: 150, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 5, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 45, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [25, 32, 28, 45, 18, 12, 15, 8, 4, 2, 5, 2, 1, 3],
    tempHistory: [27, 26, 25, 24, 26, 27, 28, 29, 30, 29, 28, 27, 28, 27],
    symptomHistory: {
      "Fever": [14, 16, 18, 22, 27, 33, 41, 50, 60, 71, 83, 96, 110, 125],
      "Diarrhea": [5, 6, 4, 5, 3, 4, 5, 6, 5, 4, 5, 6, 5, 4],
      "Malaria": [8, 11, 15, 20, 26, 33, 41, 50, 60, 71, 83, 96, 110, 125],
      "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
    }
  },
  {
    id: "titabar",
    name: "Titabar CHC",
    type: "CHC",
    location: "Jorhat District South",
    doctorAttendance: 92,
    bedsTotal: 40,
    bedsAvailable: 22,
    testKitsAvailable: 85,
    testKitsMinRequired: 50,
    stock: {
      "Paracetamol": { current: 290, minRequired: 150, unit: "Tablets" },
      "ORS Packets": { current: 210, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 55, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 70, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [8, 12, 15, 10, 6, 4, 2, 1, 0, 0, 1, 0, 0, 0],
    tempHistory: [28, 29, 30, 29, 28, 27, 28, 29, 30, 31, 30, 29, 28, 29],
    symptomHistory: {
      "Fever": [6, 7, 5, 6, 4, 5, 6, 7, 6, 5, 6, 7, 6, 5],
      "Diarrhea": [3, 4, 2, 3, 1, 2, 3, 4, 3, 2, 3, 4, 3, 2],
      "Malaria": [0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      "Rash": [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
    }
  },
  // ==================== NAGALAND ====================
  {
    id: "chiephobozou",
    name: "Chiephobozou CHC",
    type: "CHC",
    location: "Kohima District North",
    doctorAttendance: 88,
    bedsTotal: 30,
    bedsAvailable: 8,
    testKitsAvailable: 50,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 200, minRequired: 120, unit: "Tablets" },
      "ORS Packets": { current: 150, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 40, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 50, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [5, 8, 12, 15, 6, 4, 2, 1, 0, 0, 1, 0, 0, 0],
    tempHistory: [22, 23, 24, 23, 22, 21, 22, 23, 24, 25, 24, 23, 22, 23],
    symptomHistory: {
      "Fever": [10, 12, 11, 13, 16, 20, 25, 31, 38, 46, 55, 65, 76, 88],
      "Diarrhea": [4, 5, 3, 4, 2, 3, 4, 5, 4, 3, 4, 5, 4, 3],
      "Malaria": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
    }
  },
  {
    id: "tseminyu",
    name: "Tseminyu PHC",
    type: "PHC",
    location: "Kohima District North-East",
    doctorAttendance: 82,
    bedsTotal: 15,
    bedsAvailable: 9,
    testKitsAvailable: 35,
    testKitsMinRequired: 30,
    stock: {
      "Paracetamol": { current: 150, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 95, minRequired: 80, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 28, minRequired: 25, unit: "Vials" },
      "Doxycycline": { current: 35, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [4, 6, 10, 8, 4, 2, 1, 0, 0, 0, 1, 0, 0, 0],
    tempHistory: [21, 22, 23, 22, 21, 20, 21, 22, 23, 24, 23, 22, 21, 22],
    symptomHistory: {
      "Fever": [6, 7, 5, 6, 4, 5, 6, 7, 6, 5, 6, 7, 6, 5],
      "Diarrhea": [3, 4, 2, 3, 1, 2, 3, 4, 3, 2, 3, 4, 3, 2],
      "Malaria": [0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      "Rash": [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
    }
  },
  // ==================== TELANGANA ====================
  {
    id: "choutuppal",
    name: "Choutuppal PHC",
    type: "PHC",
    location: "Yadadri District East",
    doctorAttendance: 95,
    bedsTotal: 20,
    bedsAvailable: 2,
    testKitsAvailable: 12,
    testKitsMinRequired: 50,
    stock: {
      "Paracetamol": { current: 15, minRequired: 150, unit: "Tablets" },
      "ORS Packets": { current: 120, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 80, minRequired: 50, unit: "Vials" },
      "Doxycycline": { current: 40, minRequired: 50, unit: "Capsules" }
    },
    rainfallHistory: [2, 1, 0, 0, 0, 42, 5, 1, 0, 0, 2, 0, 0, 0],
    tempHistory: [31, 32, 33, 31, 29, 26, 28, 30, 31, 32, 33, 34, 33, 32],
    symptomHistory: {
      "Fever": [12, 14, 15, 11, 9, 8, 15, 22, 29, 36, 42, 48, 55, 62],
      "Diarrhea": [4, 5, 3, 2, 4, 3, 5, 4, 6, 5, 4, 3, 5, 4],
      "Malaria": [1, 0, 1, 0, 0, 0, 2, 3, 5, 8, 11, 14, 18, 22],
      "Rash": [2, 1, 1, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
    }
  },
  {
    id: "ramannapet",
    name: "Ramannapet PHC",
    type: "PHC",
    location: "Yadadri District South",
    doctorAttendance: 55,
    bedsTotal: 15,
    bedsAvailable: 12,
    testKitsAvailable: 60,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 350, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 8, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 15, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 65, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 12, 15, 2, 0, 0, 0, 0, 1, 0, 0],
    tempHistory: [33, 34, 35, 33, 32, 31, 32, 33, 34, 35, 36, 35, 34, 35],
    symptomHistory: {
      "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
      "Diarrhea": [15, 18, 20, 22, 25, 29, 32, 38, 45, 52, 60, 68, 75, 84],
      "Malaria": [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
      "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
    }
  },
  // ==================== TAMIL NADU ====================
  {
    id: "sriperumbudur",
    name: "Sriperumbudur CHC",
    type: "CHC",
    location: "Kanchipuram District West",
    doctorAttendance: 85,
    bedsTotal: 40,
    bedsAvailable: 3,
    testKitsAvailable: 15,
    testKitsMinRequired: 60,
    stock: {
      "Paracetamol": { current: 250, minRequired: 150, unit: "Tablets" },
      "ORS Packets": { current: 14, minRequired: 100, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 45, minRequired: 40, unit: "Vials" },
      "Doxycycline": { current: 55, minRequired: 40, unit: "Capsules" }
    },
    rainfallHistory: [1, 0, 0, 0, 2, 4, 15, 8, 2, 1, 0, 1, 0, 0],
    tempHistory: [34, 35, 36, 35, 34, 32, 33, 34, 35, 36, 35, 34, 33, 34],
    symptomHistory: {
      "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
      "Diarrhea": [18, 21, 24, 28, 33, 40, 48, 57, 68, 80, 94, 110, 128, 148],
      "Malaria": [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
      "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
    }
  },
  {
    id: "kundrathur",
    name: "Kundrathur PHC",
    type: "PHC",
    location: "Kanchipuram District East",
    doctorAttendance: 92,
    bedsTotal: 20,
    bedsAvailable: 12,
    testKitsAvailable: 60,
    testKitsMinRequired: 40,
    stock: {
      "Paracetamol": { current: 200, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: 150, minRequired: 80, unit: "Sachets" },
      "Artesunate (Malaria)": { current: 35, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: 40, minRequired: 30, unit: "Capsules" }
    },
    rainfallHistory: [0, 0, 0, 0, 1, 3, 5, 2, 0, 0, 0, 1, 0, 0],
    tempHistory: [33, 34, 35, 34, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
    symptomHistory: {
      "Fever": [6, 7, 5, 6, 4, 5, 6, 7, 6, 5, 6, 7, 6, 5],
      "Diarrhea": [4, 5, 3, 4, 2, 3, 4, 5, 4, 3, 4, 5, 4, 3],
      "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      "Rash": [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
    }
  }
];

const SEED_TRANSFER_LOGS = [
  {
    id: "tx-101",
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    sourcePhcName: "Mohanlalganj CHC",
    targetPhcName: "Malihabad PHC",
    drugName: "Paracetamol",
    quantity: 150,
    status: "Approved"
  },
  {
    id: "tx-102",
    timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    sourcePhcName: "Chinhat PHC",
    targetPhcName: "Varanasi Central CHC",
    drugName: "ORS Packets",
    quantity: 120,
    status: "Approved"
  },
  {
    id: "tx-103",
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    sourcePhcName: "Gorakhpur Urban CHC",
    targetPhcName: "Pipraich PHC",
    drugName: "Artesunate (Malaria)",
    quantity: 75,
    status: "Approved"
  },
  {
    id: "tx-104",
    timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    sourcePhcName: "Patna Sadar Hospital",
    targetPhcName: "Phulwari Sharif PHC",
    drugName: "Azithromycin",
    quantity: 90,
    status: "Approved"
  },
  {
    id: "tx-105",
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    sourcePhcName: "Ahmedabad Civil CHC",
    targetPhcName: "Sanand PHC",
    drugName: "IV Saline",
    quantity: 110,
    status: "Approved"
  },
  {
    id: "tx-106",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    sourcePhcName: "Gurugram Base CHC",
    targetPhcName: "Sohna PHC",
    drugName: "Doxycycline",
    quantity: 65,
    status: "Approved"
  },
  {
    id: "tx-107",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sourcePhcName: "Guwahati Regional CHC",
    targetPhcName: "Hajo PHC",
    drugName: "Ceftriaxone",
    quantity: 50,
    status: "Approved"
  }
];

const SERVER_PHC_GEOGRAPHY: Record<string, { lat: number; lon: number; district: string; state: string }> = {
  malihabad: { lat: 26.9200, lon: 80.7100, district: "Lucknow", state: "Uttar Pradesh" },
  mohanlalganj: { lat: 26.6800, lon: 80.9700, district: "Lucknow", state: "Uttar Pradesh" },
  chinhat: { lat: 26.8700, lon: 81.0300, district: "Lucknow", state: "Uttar Pradesh" },
  cholapur: { lat: 25.4600, lon: 82.9800, district: "Varanasi", state: "Uttar Pradesh" },
  pindra: { lat: 25.4800, lon: 82.7900, district: "Varanasi", state: "Uttar Pradesh" },
  kashi_vidya: { lat: 25.2900, lon: 82.9600, district: "Varanasi", state: "Uttar Pradesh" },
  campierganj: { lat: 27.0200, lon: 83.2700, district: "Gorakhpur", state: "Uttar Pradesh" },
  pipraich: { lat: 26.8100, lon: 83.5300, district: "Gorakhpur", state: "Uttar Pradesh" },
  bhathat: { lat: 26.8900, lon: 83.3900, district: "Gorakhpur", state: "Uttar Pradesh" },
  fatehabad: { lat: 27.0200, lon: 78.3000, district: "Agra", state: "Uttar Pradesh" },
  achhnera: { lat: 27.1800, lon: 77.7600, district: "Agra", state: "Uttar Pradesh" },
  pinahat: { lat: 26.8800, lon: 78.3800, district: "Agra", state: "Uttar Pradesh" },
  kalyanpur: { lat: 26.5200, lon: 80.2600, district: "Kanpur Nagar", state: "Uttar Pradesh" },
  bidhnu: { lat: 26.3200, lon: 80.3100, district: "Kanpur Nagar", state: "Uttar Pradesh" },
  sarsaul: { lat: 26.2700, lon: 80.5000, district: "Kanpur Nagar", state: "Uttar Pradesh" },

  // Bihar
  phulwari_sharif: { lat: 25.5700, lon: 85.0700, district: "Patna", state: "Bihar" },
  musahri: { lat: 26.1200, lon: 85.4500, district: "Muzaffarpur", state: "Bihar" },

  // Gujarat
  sanand: { lat: 23.0200, lon: 72.3800, district: "Ahmedabad", state: "Gujarat" },
  viramgam: { lat: 23.1200, lon: 72.0300, district: "Ahmedabad", state: "Gujarat" },

  // Haryana
  sohna: { lat: 28.2500, lon: 77.0700, district: "Gurugram", state: "Haryana" },
  farrukhnagar: { lat: 28.4500, lon: 76.8200, district: "Gurugram", state: "Haryana" },

  // Assam
  hajo: { lat: 26.2500, lon: 91.5300, district: "Kamrup", state: "Assam" },
  titabar: { lat: 26.6000, lon: 94.2000, district: "Jorhat", state: "Assam" },

  // Nagaland
  chiephobozou: { lat: 25.8000, lon: 94.1200, district: "Kohima", state: "Nagaland" },
  tseminyu: { lat: 25.9000, lon: 94.2100, district: "Kohima", state: "Nagaland" },

  // Telangana
  choutuppal: { lat: 17.2500, lon: 78.9000, district: "Yadadri", state: "Telangana" },
  ramannapet: { lat: 17.2900, lon: 79.1000, district: "Yadadri", state: "Telangana" },
  addagudur: { lat: 17.3200, lon: 79.2000, district: "Yadadri", state: "Telangana" },
  bommalaramaram: { lat: 17.4000, lon: 78.8500, district: "Yadadri", state: "Telangana" },
  chityala: { lat: 17.2000, lon: 79.0500, district: "Yadadri", state: "Telangana" },
  narayanpur: { lat: 17.1500, lon: 78.8000, district: "Yadadri", state: "Telangana" },
  bibinagar: { lat: 17.4500, lon: 78.8000, district: "Yadadri", state: "Telangana" },
  motakondur: { lat: 17.4800, lon: 79.0200, district: "Yadadri", state: "Telangana" },
  bhuvanagiri_rural: { lat: 17.3500, lon: 78.9500, district: "Yadadri", state: "Telangana" },
  yadagirigutta: { lat: 17.5200, lon: 78.9500, district: "Yadadri", state: "Telangana" },
  turkapally: { lat: 17.6000, lon: 78.9000, district: "Yadadri", state: "Telangana" },
  rajapet: { lat: 17.6500, lon: 78.9800, district: "Yadadri", state: "Telangana" },
  atmakur: { lat: 17.3000, lon: 79.1500, district: "Yadadri", state: "Telangana" },
  gundala: { lat: 17.1000, lon: 79.3000, district: "Yadadri", state: "Telangana" },

  // Tamil Nadu
  sriperumbudur: { lat: 12.9700, lon: 79.9500, district: "Kanchipuram", state: "Tamil Nadu" },
  kundrathur: { lat: 13.0000, lon: 80.0600, district: "Kanchipuram", state: "Tamil Nadu" }
};

const ALL_STATES_UTS = [
  { name: "Andhra Pradesh", lat: 15.9129, lon: 79.7400, district: "Guntur", center: "Guntur", population: 53.2 },
  { name: "Arunachal Pradesh", lat: 28.2180, lon: 94.7278, district: "Papum Pare", center: "Itanagar", population: 1.7 },
  { name: "Assam", lat: 26.2006, lon: 92.9376, district: "Kamrup", center: "Kamrup", population: 35.6 },
  { name: "Bihar", lat: 25.0961, lon: 85.3131, district: "Patna", center: "Patna", population: 131.0 },
  { name: "Chhattisgarh", lat: 21.2787, lon: 81.8661, district: "Raipur", center: "Raipur", population: 30.0 },
  { name: "Goa", lat: 15.2993, lon: 74.1240, district: "North Goa", center: "Panaji", population: 2.0 },
  { name: "Gujarat", lat: 22.2587, lon: 71.1924, district: "Ahmedabad", center: "Ahmedabad", population: 71.5 },
  { name: "Haryana", lat: 29.0588, lon: 76.0856, district: "Gurugram", center: "Gurugram", population: 29.4 },
  { name: "Himachal Pradesh", lat: 31.1048, lon: 77.1734, district: "Shimla", center: "Shimla", population: 7.5 },
  { name: "Jharkhand", lat: 23.6102, lon: 85.2799, district: "Ranchi", center: "Ranchi", population: 39.5 },
  { name: "Karnataka", lat: 15.3173, lon: 75.7139, district: "Bengaluru", center: "Bengaluru", population: 67.7 },
  { name: "Kerala", lat: 10.8505, lon: 76.2711, district: "Trivandrum", center: "Thiruvananthapuram", population: 35.8 },
  { name: "Madhya Pradesh", lat: 22.9734, lon: 78.6569, district: "Bhopal", center: "Bhopal", population: 86.6 },
  { name: "Maharashtra", lat: 19.7515, lon: 75.7139, district: "Pune", center: "Pune", population: 126.4 },
  { name: "Manipur", lat: 24.6637, lon: 93.9063, district: "Imphal West", center: "Imphal", population: 3.3 },
  { name: "Meghalaya", lat: 25.4670, lon: 91.3662, district: "East Khasi Hills", center: "Shillong", population: 3.8 },
  { name: "Mizoram", lat: 23.1645, lon: 92.9376, district: "Aizawl", center: "Aizawl", population: 1.3 },
  { name: "Nagaland", lat: 26.1584, lon: 94.5624, district: "Kohima", center: "Kohima", population: 2.5 },
  { name: "Odisha", lat: 20.9517, lon: 85.0985, district: "Khurda", center: "Bhubaneswar", population: 46.3 },
  { name: "Punjab", lat: 31.1471, lon: 75.3412, district: "Amritsar", center: "Amritsar", population: 30.1 },
  { name: "Rajasthan", lat: 27.0238, lon: 74.2179, district: "Jaipur", center: "Jaipur", population: 81.0 },
  { name: "Sikkim", lat: 27.5330, lon: 88.5122, district: "East Sikkim", center: "Gangtok", population: 0.71 },
  { name: "Tamil Nadu", lat: 11.1271, lon: 78.6569, district: "Kanchipuram", center: "Chennai", population: 76.9 },
  { name: "Telangana", lat: 17.2500, lon: 78.9000, district: "Yadadri", center: "Choutuppal", population: 38.1 },
  { name: "Tripura", lat: 23.9408, lon: 91.9882, district: "West Tripura", center: "Agartala", population: 4.2 },
  { name: "Uttar Pradesh", lat: 26.8467, lon: 80.9462, district: "Lucknow", center: "Lucknow", population: 241.3 },
  { name: "Uttarakhand", lat: 30.0668, lon: 79.0193, district: "Dehradun", center: "Dehradun", population: 12.1 },
  { name: "West Bengal", lat: 22.9868, lon: 87.8550, district: "Kolkata", center: "Kolkata", population: 99.1 },
  
  // Union Territories
  { name: "Andaman and Nicobar Islands", lat: 11.7401, lon: 92.6586, district: "South Andaman", center: "Port Blair", population: 0.44 },
  { name: "Chandigarh", lat: 30.7333, lon: 76.7794, district: "Chandigarh", center: "Chandigarh", population: 1.2 },
  { name: "Dadra and Nagar Haveli and Daman and Diu", lat: 20.1800, lon: 73.0100, district: "Daman", center: "Daman", population: 0.65 },
  { name: "Delhi", lat: 28.7041, lon: 77.1025, district: "New Delhi", center: "Delhi", population: 22.3 },
  { name: "Jammu and Kashmir", lat: 33.7782, lon: 76.5762, district: "Srinagar", center: "Srinagar", population: 14.5 },
  { name: "Ladakh", lat: 34.1526, lon: 77.5771, district: "Leh", center: "Leh", population: 0.3 },
  { name: "Lakshadweep", lat: 10.5667, lon: 72.6417, district: "Kavaratti", center: "Kavaratti", population: 0.07 },
  { name: "Puducherry", lat: 11.9416, lon: 79.8083, district: "Puducherry", center: "Puducherry", population: 1.6 }
];

// Reference point: Uttar Pradesh has 15 hand-seeded facilities and ~241.3 million people.
// Every auto-generated state scales its facility count off that same ratio, with a floor of 2
// so even the smallest states/UTs still show a couple of sample facilities.
const REFERENCE_POPULATION = 241.3;
const REFERENCE_FACILITY_COUNT = 15;
const getFacilityCountForPopulation = (populationMillions: number): number => {
  const scaled = Math.round((populationMillions / REFERENCE_POPULATION) * REFERENCE_FACILITY_COUNT);
  return Math.max(2, scaled);
};

function getFullPopulatedPHCs(): PHCData[] {
  const basePhcs: PHCData[] = JSON.parse(JSON.stringify(SEED_PHCS));
  
  // Attach state, district, lat, lon to the hand-seeded ones
  basePhcs.forEach(phc => {
    const geo = SERVER_PHC_GEOGRAPHY[phc.id];
    if (geo) {
      phc.state = geo.state;
      phc.district = geo.district;
      phc.latitude = geo.lat;
      phc.longitude = geo.lon;
    } else {
      phc.state = "Telangana";
      phc.district = "Yadadri";
      phc.latitude = 17.2500;
      phc.longitude = 78.9000;
    }
  });

  const representedStates = new Set(basePhcs.map(p => p.state!.toUpperCase()));

  const LOCATION_SUFFIXES = [
    "District Center", "North Sector", "South Sector", "East Sector",
    "West Sector", "Rural Belt", "Urban Cluster", "Border Zone",
    "River Basin Zone", "Highway Corridor", "Hill Tract", "Coastal Belt"
  ];

  ALL_STATES_UTS.forEach((area) => {
    if (!representedStates.has(area.name.toUpperCase())) {
      const stateSlug = area.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const facilityCount = getFacilityCountForPopulation(area.population);
      // Spread facilities out a bit more for states with larger counts so pins don't all overlap
      const spread = 0.15 + Math.min(facilityCount, 10) * 0.03;

      for (let i = 0; i < facilityCount; i++) {
        const isChc = i % 2 === 1;
        const suffix = LOCATION_SUFFIXES[i % LOCATION_SUFFIXES.length];
        const idSuffix = i === 0 ? "" : `_${i + 1}`;

        const facility: PHCData = {
          id: `${stateSlug}_${isChc ? "chc" : "phc"}${idSuffix}`,
          name: `${area.center} ${isChc ? "CHC" : "PHC"}${i >= 2 ? ` ${i + 1}` : ""}`,
          type: isChc ? "CHC" : "PHC",
          location: `${area.district} ${suffix}`,
          state: area.name,
          district: area.district,
          latitude: area.lat - spread + Math.random() * (spread * 2),
          longitude: area.lon - spread + Math.random() * (spread * 2),
          doctorAttendance: isChc ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 60,
          bedsTotal: isChc ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 10) + 10,
          bedsAvailable: isChc ? Math.floor(Math.random() * 40) + 10 : Math.floor(Math.random() * 8) + 2,
          testKitsAvailable: isChc ? Math.floor(Math.random() * 150) + 50 : Math.floor(Math.random() * 50) + 30,
          testKitsMinRequired: isChc ? 100 : 40,
          stock: isChc ? {
            "Paracetamol": { current: Math.floor(Math.random() * 300) + 100, minRequired: 200, unit: "Tablets" },
            "ORS Packets": { current: Math.floor(Math.random() * 200) + 80, minRequired: 150, unit: "Sachets" },
            "Artesunate (Malaria)": { current: Math.floor(Math.random() * 80) + 20, minRequired: 50, unit: "Vials" },
            "Doxycycline": { current: Math.floor(Math.random() * 100) + 30, minRequired: 60, unit: "Capsules" }
          } : {
            "Paracetamol": { current: Math.floor(Math.random() * 150) + 50, minRequired: 100, unit: "Tablets" },
            "ORS Packets": { current: Math.floor(Math.random() * 120) + 40, minRequired: 80, unit: "Sachets" },
            "Artesunate (Malaria)": { current: Math.floor(Math.random() * 30) + 10, minRequired: 20, unit: "Vials" },
            "Doxycycline": { current: Math.floor(Math.random() * 40) + 10, minRequired: 25, unit: "Capsules" }
          },
          rainfallHistory: Array.from({ length: 14 }, () => Math.floor(Math.random() * 15)),
          tempHistory: Array.from({ length: 14 }, () => Math.floor(Math.random() * 8) + 28),
          symptomHistory: isChc ? {
            "Fever": Array.from({ length: 14 }, () => Math.floor(Math.random() * 20) + 10),
            "Diarrhea": Array.from({ length: 14 }, (_, i2) => Math.floor(Math.random() * 12) + 5 + (i2 > 7 ? Math.floor(Math.random() * 10) : 0)),
            "Malaria": Array.from({ length: 14 }, () => Math.floor(Math.random() * 6)),
            "Rash": Array.from({ length: 14 }, () => Math.floor(Math.random() * 4))
          } : {
            "Fever": Array.from({ length: 14 }, (_, i2) => Math.floor(Math.random() * 10) + 10 + (i2 > 7 ? Math.floor(Math.random() * 15) : 0)),
            "Diarrhea": Array.from({ length: 14 }, () => Math.floor(Math.random() * 8) + 2),
            "Malaria": Array.from({ length: 14 }, () => Math.floor(Math.random() * 4)),
            "Rash": Array.from({ length: 14 }, () => Math.floor(Math.random() * 3))
          }
        };

        basePhcs.push(facility);
      }
    }
  });

  // Normalize all PHCs to ensure they include all expanded stock items and disease symptom histories
  basePhcs.forEach(phc => {
    const requiredDrugs = {
      "Paracetamol": { current: Math.floor(Math.random() * 200) + 50, minRequired: 100, unit: "Tablets" },
      "ORS Packets": { current: Math.floor(Math.random() * 150) + 50, minRequired: 80, unit: "Sachets" },
      "Artesunate (Malaria)": { current: Math.floor(Math.random() * 50) + 15, minRequired: 30, unit: "Vials" },
      "Doxycycline": { current: Math.floor(Math.random() * 60) + 20, minRequired: 30, unit: "Capsules" },
      "Azithromycin": { current: Math.floor(Math.random() * 80) + 20, minRequired: 40, unit: "Tablets" },
      "Ceftriaxone": { current: Math.floor(Math.random() * 40) + 10, minRequired: 20, unit: "Vials" },
      "IV Saline": { current: Math.floor(Math.random() * 60) + 10, minRequired: 30, unit: "Bottles" },
      "Zinc Supplements": { current: Math.floor(Math.random() * 100) + 40, minRequired: 50, unit: "Tablets" }
    };
    phc.stock = { ...requiredDrugs, ...phc.stock };

    const requiredSymptoms = {
      "Fever": phc.symptomHistory["Fever"] || Array.from({ length: 14 }, () => Math.floor(Math.random() * 25) + 10),
      "Diarrhea": phc.symptomHistory["Diarrhea"] || Array.from({ length: 14 }, () => Math.floor(Math.random() * 15) + 5),
      "Malaria": phc.symptomHistory["Malaria"] || Array.from({ length: 14 }, () => Math.floor(Math.random() * 12) + 2),
      "Rash": phc.symptomHistory["Rash"] || Array.from({ length: 14 }, () => Math.floor(Math.random() * 8) + 1),
      "Dengue": phc.symptomHistory["Dengue"] || Array.from({ length: 14 }, () => Math.floor(Math.random() * 10) + 1),
      "Typhoid": phc.symptomHistory["Typhoid"] || Array.from({ length: 14 }, () => Math.floor(Math.random() * 8) + 1),
      "Respiratory (ARI)": phc.symptomHistory["Respiratory (ARI)"] || Array.from({ length: 14 }, () => Math.floor(Math.random() * 20) + 5)
    };
    phc.symptomHistory = requiredSymptoms;
  });

  return basePhcs;
}

let phcs: PHCData[] = getFullPopulatedPHCs();
let transferLogs = JSON.parse(JSON.stringify(SEED_TRANSFER_LOGS));

// Helper calculations for forecasting & risk scores (Unified, Explainable rules)
function calculateForecastAndRisk(phc: PHCData): { forecasts: ForecastResult[]; risk: RiskAnalysis } {
  const forecasts: ForecastResult[] = [];
  const reasons: string[] = [];

  // 1. Calculate disease trends and spikes
  Object.keys(phc.symptomHistory).forEach((symptom) => {
    const history = phc.symptomHistory[symptom];
    const firstWeekSum = history.slice(0, 7).reduce((a, b) => a + b, 0);
    const secondWeekSum = history.slice(7, 14).reduce((a, b) => a + b, 0);
    const slope = (secondWeekSum - firstWeekSum) / 7;

    let trend: 'rising' | 'stable' | 'falling' = 'stable';
    if (slope > 1.5) trend = 'rising';
    else if (slope < -1.5) trend = 'falling';

    // Linear projected count for the next 7 days based on the second week and current slope
    const currentLevel = history[13];
    const projectedCount = Math.max(0, Math.round(currentLevel * 7 + (slope * 7)));

    // Risk calculation for this specific disease
    let diseaseRisk = 0;
    if (trend === 'rising') {
      diseaseRisk += slope * 10;
    }

    // Rainfall and temperature lag factors
    const maxRainInLast10Days = Math.max(...phc.rainfallHistory.slice(4, 14));
    if (maxRainInLast10Days > 20 && (symptom === "Fever" || symptom === "Malaria")) {
      diseaseRisk += 25; // Mosquito-borne risk boost from rainfall water clogging
    }

    const avgTemp = phc.tempHistory.reduce((a, b) => a + b, 0) / 14;
    if (avgTemp > 33 && symptom === "Diarrhea") {
      diseaseRisk += 20; // Heatwave-driven water contamination risk
    }

    const finalDiseaseRisk = Math.min(100, Math.max(10, Math.round(diseaseRisk + (currentLevel * 1.2))));

    // Local-rule reasoning explanation (Gemini will enrich this, but we provide a pristine default fallback)
    let localReasoning = `Symptom cases are ${trend} at a rate of ${slope.toFixed(1)}/day.`;
    if (maxRainInLast10Days > 20 && (symptom === "Fever" || symptom === "Malaria")) {
      localReasoning += ` Heavy rainfall spike (${maxRainInLast10Days}mm) 8-10 days ago accelerates vector breeding.`;
    }
    if (avgTemp > 33 && symptom === "Diarrhea") {
      localReasoning += ` Extreme average temperature of ${avgTemp.toFixed(1)}°C accelerates bacterial spoilage and water risk.`;
    }

    forecasts.push({
      symptom,
      currentTrend: trend,
      movingAverageSlope: slope,
      projectedCount,
      riskScore: finalDiseaseRisk,
      horizonDays: trend === 'rising' ? "10-14 days" : "14+ days",
      reasoning: localReasoning
    });
  });

  // 2. District Command Risk score calculation (0 - 100)
  // We sum up risks from multiple domains:
  // - Stock shortages (up to 40 pts)
  // - Doctor Attendance (up to 20 pts)
  // - Bed Availability (up to 20 pts)
  // - Test Kit shortages (up to 20 pts)
  let stockRiskPoints = 0;
  const criticalShortages: string[] = [];
  Object.keys(phc.stock).forEach((drug) => {
    const s = phc.stock[drug];
    if (s.current === 0) {
      stockRiskPoints += 20;
      criticalShortages.push(`No stock of ${drug}`);
    } else if (s.current < s.minRequired) {
      stockRiskPoints += 10;
      criticalShortages.push(`Low stock of ${drug} (${s.current}/${s.minRequired})`);
    }
  });
  stockRiskPoints = Math.min(40, stockRiskPoints);

  let doctorRiskPoints = 0;
  if (phc.doctorAttendance < 60) {
    doctorRiskPoints = 20;
    reasons.push(`Severely low doctor attendance (${phc.doctorAttendance}%)`);
  } else if (phc.doctorAttendance < 80) {
    doctorRiskPoints = 10;
    reasons.push(`Sub-optimal doctor attendance (${phc.doctorAttendance}%)`);
  }

  let bedRiskPoints = 0;
  const bedAvailPct = phc.bedsTotal > 0 ? (phc.bedsAvailable / phc.bedsTotal) * 100 : 0;
  if (bedAvailPct === 0) {
    bedRiskPoints = 20;
    reasons.push(`No hospital beds available`);
  } else if (bedAvailPct < 20) {
    bedRiskPoints = 15;
    reasons.push(`Bed capacity near limit (${phc.bedsAvailable}/${phc.bedsTotal} left)`);
  }

  let testKitRiskPoints = 0;
  if (phc.testKitsAvailable < phc.testKitsMinRequired * 0.3) {
    testKitRiskPoints = 20;
    reasons.push(`Critically low diagnostic test kits (${phc.testKitsAvailable}/${phc.testKitsMinRequired})`);
  } else if (phc.testKitsAvailable < phc.testKitsMinRequired) {
    testKitRiskPoints = 10;
    reasons.push(`Slight test kit shortage (${phc.testKitsAvailable}/${phc.testKitsMinRequired})`);
  }

  // Combine clinical epidemic risks with resource risks
  const maxEpidemicRisk = Math.max(...forecasts.map(f => f.riskScore));
  const rawScore = (stockRiskPoints + doctorRiskPoints + bedRiskPoints + testKitRiskPoints) * 0.6 + maxEpidemicRisk * 0.4;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Determine Red/Amber/Green classification
  let status: 'red' | 'amber' | 'green' = 'green';
  if (score >= 75 || criticalShortages.some(s => s.includes("No stock")) || phc.bedsAvailable === 0 || phc.doctorAttendance < 60) {
    status = 'red';
  } else if (score >= 40 || criticalShortages.length > 0 || phc.testKitsAvailable < phc.testKitsMinRequired) {
    status = 'amber';
  }

  // Append critical stock reasons to main reasons list
  if (criticalShortages.length > 0) {
    reasons.push(...criticalShortages.slice(0, 3));
  }

  if (reasons.length === 0) {
    reasons.push("All operational indicators and epidemic counts stable.");
  }

  return {
    forecasts,
    risk: {
      phcId: phc.id,
      score,
      status,
      reasons
    }
  };
}

// REST API Endpoints

let manualSimulationOverride = (apiKey && apiKey !== "MY_GEMINI_API_KEY") ? false : true;

// GET /api/phcs - Return calculated list
app.get("/api/phcs", (req, res) => {
  const result = phcs.map((phc) => {
    const { forecasts, risk } = calculateForecastAndRisk(phc);
    return {
      ...phc,
      forecasts,
      riskAnalysis: risk,
      // Hackathon required minimum fields
      facility_name: phc.name,
      facility_type: phc.type,
      state: phc.state,
      district: phc.district,
      latitude: phc.latitude,
      longitude: phc.longitude,
      footfall_count: Math.round(phc.symptomHistory.Fever[13] + phc.symptomHistory.Diarrhea[13] + (phc.symptomHistory.Malaria?.[13] || 0) + (phc.symptomHistory.Rash?.[13] || 0)),
      doctor_attended: phc.doctorAttendance >= 70 ? "Yes" : "No",
      bed_available: phc.bedsAvailable > 0 ? "Yes" : "No",
      test_kit_available: phc.testKitsAvailable >= 10 ? "Yes" : "No",
      risk_score: risk.score
    };
  });
  res.json({ phcs: result, transferLogs, simulationMode: manualSimulationOverride });
});

// POST /api/simulation/toggle - Toggle simulation override manually
app.post("/api/simulation/toggle", (req, res) => {
  manualSimulationOverride = !manualSimulationOverride;
  res.json({ success: true, simulationMode: manualSimulationOverride });
});

// POST /api/phcs/reset - Reset seed data
app.post("/api/phcs/reset", (req, res) => {
  phcs = getFullPopulatedPHCs();
  transferLogs = JSON.parse(JSON.stringify(SEED_TRANSFER_LOGS));
  return res.json({ success: true, message: "Database re-seeded successfully." });
  const _legacy_phcs = [
    {
      id: "choutuppal",
      name: "Choutuppal PHC",
      type: "PHC",
      location: "Yadadri District East",
      doctorAttendance: 95,
      bedsTotal: 20,
      bedsAvailable: 2,
      testKitsAvailable: 12,
      testKitsMinRequired: 50,
      stock: {
        "Paracetamol": { current: 15, minRequired: 150, unit: "Tablets" },
        "ORS Packets": { current: 120, minRequired: 100, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 80, minRequired: 50, unit: "Vials" },
        "Doxycycline": { current: 40, minRequired: 50, unit: "Capsules" }
      },
      rainfallHistory: [2, 1, 0, 0, 0, 42, 5, 1, 0, 0, 2, 0, 0, 0],
      tempHistory: [31, 32, 33, 31, 29, 26, 28, 30, 31, 32, 33, 34, 33, 32],
      symptomHistory: {
        "Fever": [12, 14, 15, 11, 9, 8, 15, 22, 29, 36, 42, 48, 55, 62],
        "Diarrhea": [4, 5, 3, 2, 4, 3, 5, 4, 6, 5, 4, 3, 5, 4],
        "Malaria": [1, 0, 1, 0, 0, 0, 2, 3, 5, 8, 11, 14, 18, 22],
        "Rash": [2, 1, 1, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
      }
    },
    {
      id: "ramannapet",
      name: "Ramannapet PHC",
      type: "PHC",
      location: "Yadadri District South",
      doctorAttendance: 55,
      bedsTotal: 15,
      bedsAvailable: 12,
      testKitsAvailable: 60,
      testKitsMinRequired: 40,
      stock: {
        "Paracetamol": { current: 350, minRequired: 100, unit: "Tablets" },
        "ORS Packets": { current: 8, minRequired: 100, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 15, minRequired: 40, unit: "Vials" },
        "Doxycycline": { current: 65, minRequired: 30, unit: "Capsules" }
      },
      rainfallHistory: [0, 0, 0, 0, 12, 15, 2, 0, 0, 0, 0, 1, 0, 0],
      tempHistory: [33, 34, 35, 33, 32, 31, 32, 33, 34, 35, 36, 35, 34, 35],
      symptomHistory: {
        "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
        "Diarrhea": [15, 18, 20, 22, 25, 29, 32, 38, 45, 52, 60, 68, 75, 84],
        "Malaria": [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
        "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
      }
    },
    {
      id: "valigonda",
      name: "Valigonda PHC",
      type: "PHC",
      location: "Yadadri District West",
      doctorAttendance: 85,
      bedsTotal: 10,
      bedsAvailable: 0,
      testKitsAvailable: 8,
      testKitsMinRequired: 30,
      stock: {
        "Paracetamol": { current: 180, minRequired: 80, unit: "Tablets" },
        "ORS Packets": { current: 150, minRequired: 80, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 6, minRequired: 30, unit: "Vials" },
        "Doxycycline": { current: 12, minRequired: 25, unit: "Capsules" }
      },
      rainfallHistory: [1, 1, 2, 5, 8, 4, 1, 0, 0, 2, 1, 0, 0, 0],
      tempHistory: [32, 31, 30, 29, 28, 29, 31, 32, 33, 34, 35, 34, 33, 32],
      symptomHistory: {
        "Fever": [5, 6, 8, 7, 9, 11, 14, 16, 19, 21, 24, 28, 31, 35],
        "Diarrhea": [3, 2, 4, 2, 3, 5, 4, 3, 5, 4, 3, 2, 3, 2],
        "Malaria": [4, 6, 7, 5, 8, 9, 12, 15, 18, 22, 27, 32, 38, 45],
        "Rash": [0, 1, 1, 0, 1, 0, 0, 1, 2, 1, 2, 3, 2, 4]
      }
    },
    {
      id: "bhongir",
      name: "Bhongir CHC",
      type: "CHC",
      location: "Bhongir Town Central",
      doctorAttendance: 98,
      bedsTotal: 100,
      bedsAvailable: 68,
      testKitsAvailable: 240,
      testKitsMinRequired: 150,
      stock: {
        "Paracetamol": { current: 800, minRequired: 300, unit: "Tablets" },
        "ORS Packets": { current: 450, minRequired: 200, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 120, minRequired: 80, unit: "Vials" },
        "Doxycycline": { current: 180, minRequired: 100, unit: "Capsules" }
      },
      rainfallHistory: [0, 0, 0, 1, 1, 2, 0, 0, 0, 0, 1, 0, 0, 0],
      tempHistory: [32, 33, 34, 33, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
      symptomHistory: {
        "Fever": [20, 22, 19, 21, 23, 22, 24, 21, 23, 20, 22, 25, 23, 24],
        "Diarrhea": [8, 10, 9, 11, 12, 10, 11, 9, 10, 8, 11, 12, 10, 11],
        "Malaria": [2, 3, 1, 2, 3, 2, 3, 2, 1, 3, 2, 1, 3, 2],
        "Rash": [4, 5, 3, 4, 5, 6, 4, 5, 3, 4, 5, 3, 4, 5]
      }
    },
    {
      id: "alair",
      name: "Alair PHC",
      type: "PHC",
      location: "Yadadri District North-East",
      doctorAttendance: 90,
      bedsTotal: 12,
      bedsAvailable: 8,
      testKitsAvailable: 45,
      testKitsMinRequired: 30,
      stock: {
        "Paracetamol": { current: 150, minRequired: 80, unit: "Tablets" },
        "ORS Packets": { current: 120, minRequired: 80, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 35, minRequired: 20, unit: "Vials" },
        "Doxycycline": { current: 50, minRequired: 20, unit: "Capsules" }
      },
      rainfallHistory: [0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0],
      tempHistory: [34, 35, 36, 35, 34, 33, 34, 35, 36, 37, 36, 35, 34, 35],
      symptomHistory: {
        "Fever": [5, 4, 6, 5, 3, 4, 5, 6, 5, 4, 6, 5, 4, 5],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
      }
    },
    {
      id: "pochampally",
      name: "Pochampally PHC",
      type: "PHC",
      location: "Yadadri District South-West",
      doctorAttendance: 75,
      bedsTotal: 15,
      bedsAvailable: 4,
      testKitsAvailable: 15,
      testKitsMinRequired: 40,
      stock: {
        "Paracetamol": { current: 110, minRequired: 100, unit: "Tablets" },
        "ORS Packets": { current: 85, minRequired: 100, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 8, minRequired: 40, unit: "Vials" },
        "Doxycycline": { current: 15, minRequired: 35, unit: "Capsules" }
      },
      rainfallHistory: [1, 2, 0, 0, 4, 15, 18, 5, 2, 1, 0, 0, 0, 0],
      tempHistory: [31, 32, 31, 30, 29, 28, 29, 31, 32, 33, 34, 33, 32, 31],
      symptomHistory: {
        "Fever": [6, 8, 7, 9, 12, 15, 18, 22, 26, 31, 36, 42, 48, 54],
        "Diarrhea": [4, 3, 5, 4, 3, 5, 6, 5, 4, 5, 4, 5, 4, 5],
        "Malaria": [2, 1, 3, 2, 4, 6, 7, 9, 11, 13, 16, 19, 22, 26],
        "Rash": [10, 12, 14, 16, 18, 22, 25, 29, 34, 39, 44, 50, 56, 62]
      }
    },
    {
      id: "bibinagar",
      name: "Bibinagar CHC",
      type: "CHC",
      location: "Yadadri North",
      doctorAttendance: 96,
      bedsTotal: 50,
      bedsAvailable: 35,
      testKitsAvailable: 180,
      testKitsMinRequired: 100,
      stock: {
        "Paracetamol": { current: 400, minRequired: 200, unit: "Tablets" },
        "ORS Packets": { current: 300, minRequired: 150, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 90, minRequired: 40, unit: "Vials" },
        "Doxycycline": { current: 110, minRequired: 50, unit: "Capsules" }
      },
      rainfallHistory: [0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0],
      tempHistory: [33, 34, 34, 33, 32, 33, 34, 33, 34, 35, 34, 33, 32, 33],
      symptomHistory: {
        "Fever": [10, 11, 9, 10, 8, 9, 11, 10, 9, 11, 10, 9, 11, 10],
        "Diarrhea": [3, 4, 2, 3, 4, 2, 3, 4, 3, 2, 3, 4, 3, 2],
        "Malaria": [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
        "Rash": [2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
      }
    },
    {
      id: "motakondur",
      name: "Motakondur PHC",
      type: "PHC",
      location: "Yadadri North-West",
      doctorAttendance: 48,
      bedsTotal: 6,
      bedsAvailable: 4,
      testKitsAvailable: 15,
      testKitsMinRequired: 35,
      stock: {
        "Paracetamol": { current: 12, minRequired: 80, unit: "Tablets" },
        "ORS Packets": { current: 20, minRequired: 60, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 8, minRequired: 25, unit: "Vials" },
        "Doxycycline": { current: 35, minRequired: 20, unit: "Capsules" }
      },
      rainfallHistory: [5, 2, 1, 0, 4, 8, 12, 18, 5, 2, 0, 0, 0, 0],
      tempHistory: [30, 31, 31, 30, 29, 29, 30, 31, 32, 31, 30, 31, 32, 31],
      symptomHistory: {
        "Fever": [5, 6, 8, 11, 14, 18, 22, 28, 35, 42, 50, 58, 67, 78],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
      }
    },
    {
      id: "bhuvanagiri_rural",
      name: "Bhuvanagiri Rural PHC",
      type: "PHC",
      location: "Yadadri Central",
      doctorAttendance: 82,
      bedsTotal: 10,
      bedsAvailable: 1,
      testKitsAvailable: 40,
      testKitsMinRequired: 40,
      stock: {
        "Paracetamol": { current: 150, minRequired: 100, unit: "Tablets" },
        "ORS Packets": { current: 95, minRequired: 100, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 30, minRequired: 30, unit: "Vials" },
        "Doxycycline": { current: 40, minRequired: 30, unit: "Capsules" }
      },
      rainfallHistory: [0, 0, 1, 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      tempHistory: [32, 33, 33, 32, 31, 32, 33, 34, 34, 33, 32, 33, 34, 33],
      symptomHistory: {
        "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
        "Diarrhea": [4, 5, 6, 5, 7, 8, 11, 14, 18, 23, 29, 36, 44, 53],
        "Malaria": [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
        "Rash": [2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
      }
    },
    {
      id: "yadagirigutta",
      name: "Yadagirigutta PHC",
      type: "PHC",
      location: "Yadagirigutta Temple Area",
      doctorAttendance: 92,
      bedsTotal: 18,
      bedsAvailable: 12,
      testKitsAvailable: 25,
      testKitsMinRequired: 80,
      stock: {
        "Paracetamol": { current: 320, minRequired: 200, unit: "Tablets" },
        "ORS Packets": { current: 240, minRequired: 150, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 15, minRequired: 40, unit: "Vials" },
        "Doxycycline": { current: 45, minRequired: 40, unit: "Capsules" }
      },
      rainfallHistory: [1, 0, 0, 0, 2, 5, 1, 0, 0, 0, 0, 1, 0, 0],
      tempHistory: [33, 34, 35, 34, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
      symptomHistory: {
        "Fever": [15, 18, 16, 20, 24, 29, 35, 42, 50, 59, 69, 80, 92, 105],
        "Diarrhea": [6, 8, 7, 9, 11, 13, 12, 14, 15, 16, 17, 18, 19, 21],
        "Malaria": [2, 1, 3, 2, 4, 6, 7, 9, 11, 13, 16, 19, 22, 26],
        "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
      }
    },
    {
      id: "turkapally",
      name: "Turkapally PHC",
      type: "PHC",
      location: "Yadadri North-West",
      doctorAttendance: 88,
      bedsTotal: 8,
      bedsAvailable: 6,
      testKitsAvailable: 55,
      testKitsMinRequired: 30,
      stock: {
        "Paracetamol": { current: 110, minRequired: 70, unit: "Tablets" },
        "ORS Packets": { current: 85, minRequired: 70, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 5, minRequired: 25, unit: "Vials" },
        "Doxycycline": { current: 15, minRequired: 20, unit: "Capsules" }
      },
      rainfallHistory: [10, 12, 15, 8, 20, 25, 35, 12, 8, 5, 2, 1, 0, 0],
      tempHistory: [28, 27, 28, 29, 28, 27, 28, 29, 30, 31, 30, 29, 28, 29],
      symptomHistory: {
        "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [2, 3, 4, 3, 6, 8, 11, 15, 20, 26, 33, 41, 50, 60],
        "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
      }
    },
    {
      id: "rajapet",
      name: "Rajapet PHC",
      type: "PHC",
      location: "Yadadri Far North",
      doctorAttendance: 78,
      bedsTotal: 12,
      bedsAvailable: 2,
      testKitsAvailable: 30,
      testKitsMinRequired: 40,
      stock: {
        "Paracetamol": { current: 5, minRequired: 100, unit: "Tablets" },
        "ORS Packets": { current: 120, minRequired: 80, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 40, minRequired: 30, unit: "Vials" },
        "Doxycycline": { current: 65, minRequired: 30, unit: "Capsules" }
      },
      rainfallHistory: [0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 1, 0, 0],
      tempHistory: [34, 35, 36, 35, 34, 33, 34, 35, 36, 37, 36, 35, 34, 35],
      symptomHistory: {
        "Fever": [12, 14, 15, 13, 16, 18, 22, 27, 33, 40, 48, 57, 68, 80],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
      }
    },
    {
      id: "atmakur",
      name: "Atmakur PHC",
      type: "PHC",
      location: "Yadadri East",
      doctorAttendance: 90,
      bedsTotal: 15,
      bedsAvailable: 11,
      testKitsAvailable: 70,
      testKitsMinRequired: 40,
      stock: {
        "Paracetamol": { current: 220, minRequired: 100, unit: "Tablets" },
        "ORS Packets": { current: 180, minRequired: 100, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 55, minRequired: 30, unit: "Vials" },
        "Doxycycline": { current: 40, minRequired: 30, unit: "Capsules" }
      },
      rainfallHistory: [0, 0, 0, 1, 1, 2, 0, 0, 0, 0, 1, 0, 0, 0],
      tempHistory: [32, 33, 34, 33, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
      symptomHistory: {
        "Fever": [5, 4, 6, 5, 3, 4, 5, 6, 5, 4, 6, 5, 4, 5],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        "Rash": [2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 4, 2, 3]
      }
    },
    {
      id: "gundala",
      name: "Gundala PHC",
      type: "PHC",
      location: "Yadadri Far South-East",
      doctorAttendance: 65,
      bedsTotal: 10,
      bedsAvailable: 8,
      testKitsAvailable: 35,
      testKitsMinRequired: 30,
      stock: {
        "Paracetamol": { current: 110, minRequired: 80, unit: "Tablets" },
        "ORS Packets": { current: 0, minRequired: 100, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 12, minRequired: 30, unit: "Vials" },
        "Doxycycline": { current: 8, minRequired: 25, unit: "Capsules" }
      },
      rainfallHistory: [2, 4, 5, 2, 8, 10, 14, 6, 2, 1, 0, 0, 0, 0],
      tempHistory: [31, 32, 31, 30, 29, 28, 29, 31, 32, 33, 34, 33, 32, 31],
      symptomHistory: {
        "Fever": [6, 8, 7, 9, 12, 15, 18, 22, 26, 31, 36, 42, 48, 54],
        "Diarrhea": [10, 12, 15, 18, 22, 27, 33, 40, 48, 57, 68, 80, 93, 108],
        "Malaria": [2, 1, 3, 2, 4, 6, 7, 9, 11, 13, 16, 19, 22, 26],
        "Rash": [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1, 2, 1]
      }
    },
    {
      id: "addagudur",
      name: "Addagudur PHC",
      type: "PHC",
      location: "Yadadri East",
      doctorAttendance: 80,
      bedsTotal: 8,
      bedsAvailable: 0,
      testKitsAvailable: 28,
      testKitsMinRequired: 30,
      stock: {
        "Paracetamol": { current: 130, minRequired: 80, unit: "Tablets" },
        "ORS Packets": { current: 90, minRequired: 80, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 24, minRequired: 20, unit: "Vials" },
        "Doxycycline": { current: 35, minRequired: 20, unit: "Capsules" }
      },
      rainfallHistory: [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      tempHistory: [33, 34, 35, 34, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
      symptomHistory: {
        "Fever": [4, 5, 3, 5, 4, 3, 5, 4, 6, 5, 4, 3, 5, 4],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
      }
    },
    {
      id: "bommalaramaram",
      name: "Bommalaramaram PHC",
      type: "PHC",
      location: "Yadadri West",
      doctorAttendance: 58,
      bedsTotal: 12,
      bedsAvailable: 10,
      testKitsAvailable: 45,
      testKitsMinRequired: 40,
      stock: {
        "Paracetamol": { current: 140, minRequired: 90, unit: "Tablets" },
        "ORS Packets": { current: 110, minRequired: 90, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 18, minRequired: 30, unit: "Vials" },
        "Doxycycline": { current: 4, minRequired: 30, unit: "Capsules" }
      },
      rainfallHistory: [1, 2, 0, 0, 3, 6, 8, 4, 1, 0, 0, 0, 0, 0],
      tempHistory: [32, 33, 32, 31, 30, 31, 32, 33, 34, 33, 32, 31, 32, 31],
      symptomHistory: {
        "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        "Rash": [5, 7, 10, 14, 19, 25, 32, 40, 49, 59, 70, 82, 95, 110]
      }
    },
    {
      id: "chityala",
      name: "Chityala PHC",
      type: "PHC",
      location: "Yadadri South",
      doctorAttendance: 84,
      bedsTotal: 15,
      bedsAvailable: 12,
      testKitsAvailable: 50,
      testKitsMinRequired: 45,
      stock: {
        "Paracetamol": { current: 180, minRequired: 100, unit: "Tablets" },
        "ORS Packets": { current: 150, minRequired: 100, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 35, minRequired: 30, unit: "Vials" },
        "Doxycycline": { current: 2, minRequired: 40, unit: "Capsules" }
      },
      rainfallHistory: [0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0],
      tempHistory: [33, 34, 35, 34, 33, 32, 33, 34, 35, 36, 35, 34, 33, 34],
      symptomHistory: {
        "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        "Rash": [4, 6, 8, 11, 15, 20, 26, 33, 41, 50, 60, 71, 83, 96]
      }
    },
    {
      id: "narayanpur",
      name: "Narayanpur PHC",
      type: "PHC",
      location: "Yadadri South-West",
      doctorAttendance: 87,
      bedsTotal: 14,
      bedsAvailable: 5,
      testKitsAvailable: 60,
      testKitsMinRequired: 40,
      stock: {
        "Paracetamol": { current: 160, minRequired: 90, unit: "Tablets" },
        "ORS Packets": { current: 130, minRequired: 90, unit: "Sachets" },
        "Artesunate (Malaria)": { current: 6, minRequired: 30, unit: "Vials" },
        "Doxycycline": { current: 45, minRequired: 30, unit: "Capsules" }
      },
      rainfallHistory: [4, 8, 12, 15, 6, 2, 1, 0, 0, 0, 1, 0, 0, 0],
      tempHistory: [31, 30, 29, 28, 29, 31, 32, 33, 34, 33, 32, 31, 32, 31],
      symptomHistory: {
        "Fever": [8, 9, 7, 8, 6, 7, 8, 9, 8, 7, 9, 8, 7, 9],
        "Diarrhea": [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2],
        "Malaria": [1, 2, 3, 5, 8, 12, 17, 23, 30, 38, 47, 57, 68, 80],
        "Rash": [1, 0, 1, 2, 0, 1, 1, 0, 1, 0, 1, 2, 0, 1]
      }
    }
  ];
  transferLogs = JSON.parse(JSON.stringify(SEED_TRANSFER_LOGS));
  res.json({ success: true, message: "Database re-seeded successfully." });
});

// POST /api/phcs/digitize - Register Photo Digitization (Gemini Multimodal OCR)
app.post("/api/phcs/digitize", async (req, res) => {
  const { phcId, imageBase64, language = 'en' } = req.body;

  if (!phcId || !imageBase64) {
    return res.status(400).json({ error: "Missing phcId or imageBase64 input." });
  }

  const phc = phcs.find((p) => p.id === phcId);
  if (!phc) {
    return res.status(404).json({ error: `PHC with ID ${phcId} not found.` });
  }

  // Base prompt demanding structured output JSON
  const systemPrompt = `You are an expert medical scribe in India. Extract and digitize handwritten patient registers.
Your response MUST be in strict JSON format. Translate symptom names and any remarks to the target language if required, but keep standard JSON property names.
Target Language for any textual output description/names: ${language}.
Extract exactly matching entries:
Each entry MUST have:
1. "date": Date in YYYY-MM-DD format.
2. "symptom": The diagnosed primary symptom (strictly mapped to one of: "Fever", "Diarrhea", "Malaria", "Rash").
3. "footfallCount": Number of patients with this symptom today.
4. "drugDispensed": Name of drug dispensed (e.g., "Paracetamol", "ORS Packets", "Artesunate (Malaria)", "Doxycycline").
5. "quantity": Integer quantity dispensed.`;

  const userPrompt = `Digitize the uploaded patient log image. Extract all records and return a JSON array containing the fields. Return ONLY valid JSON, no markdown codeblocks or explanations.`;

  // Safe fallback if Gemini is not available or fails
  const localFallbackDigitize = () => {
    // Generate simulated realistic patient logs
    const seedSymptoms = ["Fever", "Diarrhea", "Malaria", "Rash"];
    const seedDrugs: Record<string, string> = {
      "Fever": "Paracetamol",
      "Diarrhea": "ORS Packets",
      "Malaria": "Artesunate (Malaria)",
      "Rash": "Doxycycline"
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const mockCreatedRecords: DigitizedRecord[] = [
      {
        date: dateStr,
        symptom: "Fever",
        footfallCount: Math.floor(Math.random() * 8) + 5,
        drugDispensed: "Paracetamol",
        quantity: Math.floor(Math.random() * 20) + 15
      },
      {
        date: dateStr,
        symptom: "Diarrhea",
        footfallCount: Math.floor(Math.random() * 6) + 3,
        drugDispensed: "ORS Packets",
        quantity: Math.floor(Math.random() * 10) + 10
      }
    ];
    return mockCreatedRecords;
  };

  if (ai && !manualSimulationOverride) {
    try {
      // Process using GoogleGenAI SDK
      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: `${systemPrompt}\n\n${userPrompt}` }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                symptom: { type: Type.STRING },
                footfallCount: { type: Type.INTEGER },
                drugDispensed: { type: Type.STRING },
                quantity: { type: Type.INTEGER }
              },
              required: ["date", "symptom", "footfallCount", "drugDispensed", "quantity"]
            }
          }
        }
      });

      const extractedText = response.text;
      if (!extractedText) {
        throw new Error("No response from Gemini.");
      }

      const parsedRecords: DigitizedRecord[] = JSON.parse(extractedText.trim());

      // Update backend data structures
      parsedRecords.forEach((record) => {
        // Append symptom counts to the last day of the history
        if (phc.symptomHistory[record.symptom]) {
          phc.symptomHistory[record.symptom][13] += record.footfallCount;
        }
        // Deduct drug stocks in real-time!
        if (phc.stock[record.drugDispensed]) {
          phc.stock[record.drugDispensed].current = Math.max(0, phc.stock[record.drugDispensed].current - record.quantity);
        }
      });

      return res.json({
        success: true,
        records: parsedRecords,
        aiGenerated: true
      });

    } catch (error) {
      console.error("Gemini Digitization failed, using local rule-based simulation fallback:", error);
      const fallbackRecords = localFallbackDigitize();

      // Update state with fallback data so simulation actually changes the UI state in real-time
      fallbackRecords.forEach((record) => {
        if (phc.symptomHistory[record.symptom]) {
          phc.symptomHistory[record.symptom][13] += record.footfallCount;
        }
        if (phc.stock[record.drugDispensed]) {
          phc.stock[record.drugDispensed].current = Math.max(0, phc.stock[record.drugDispensed].current - record.quantity);
        }
      });

      return res.json({
        success: true,
        records: fallbackRecords,
        aiGenerated: false,
        warning: "Gemini API key inactive or request throttled. Initialized fallback simulation."
      });
    }
  } else {
    // Immediate simulation fallback if no API key is set
    const fallbackRecords = localFallbackDigitize();
    fallbackRecords.forEach((record) => {
      if (phc.symptomHistory[record.symptom]) {
        phc.symptomHistory[record.symptom][13] += record.footfallCount;
      }
      if (phc.stock[record.drugDispensed]) {
        phc.stock[record.drugDispensed].current = Math.max(0, phc.stock[record.drugDispensed].current - record.quantity);
      }
    });

    return res.json({
      success: true,
      records: fallbackRecords,
      aiGenerated: false,
      simulationMode: true
    });
  }
});

// POST /api/phcs/redistribute-draft - Generate a Gemini drafted formal stock transfer order
app.post("/api/phcs/redistribute-draft", async (req, res) => {
  const { sourcePhcId, targetPhcId, drugName, quantity, language = 'en' } = req.body;

  if (!sourcePhcId || !targetPhcId || !drugName || !quantity) {
    return res.status(400).json({ error: "Missing source, target, drugName, or quantity parameters." });
  }

  const sourcePhc = phcs.find(p => p.id === sourcePhcId);
  const targetPhc = phcs.find(p => p.id === targetPhcId);

  if (!sourcePhc || !targetPhc) {
    return res.status(404).json({ error: "Source or Target facility not found." });
  }

  const langNames: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    te: "Telugu",
    mr: "Marathi",
    bn: "Bengali",
    kn: "Kannada",
    ta: "Tamil",
    ml: "Malayalam",
    gu: "Gujarati",
    pa: "Punjabi",
    or: "Odia"
  };

  const selectedLangName = langNames[language] || "English";

  const systemPrompt = `You are a professional administrative health officer for Yadadri Bhuvanagiri District, Telangana. 
Your job is to draft a highly formal, administrative government stock redistribution transfer order.
The order MUST be drafted entirely in ${selectedLangName} language as requested. Use appropriate government formatting, clear headings, official reference number (e.g. Ref: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}), formal tone, and authorize the urgent movement.`;

  const userPrompt = `Draft an official stock transfer order with these details:
- Senders (Source Facility): ${sourcePhc.name} (Location: ${sourcePhc.location})
- Receivers (Deficit Target Facility): ${targetPhc.name} (Location: ${targetPhc.location})
- Drug Item to Transfer: ${drugName}
- Quantity to move: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}
- Urgent administrative reason: Stock shortage at target facility, while source facility holds a robust surplus. 

Format this nicely with double spacing, signatures fields, and urgent dispatch labels. Force translation of all headers, body, and signature designations to ${selectedLangName}.`;

  const localFallbackDraft = () => {
    // Beautiful multilingual static local fallbacks
    const drafts: Record<string, string> = {
      en: `OFFICE OF THE DISTRICT HEALTH OFFICER
YADADRI BHUVANAGIRI DISTRICT, TELANGANA
Ref: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

URGENT MEDICAL STOCK REDISTRIBUTION ORDER

Pursuant to the Epidemic Control Protocol, authorization is hereby granted for the urgent relocation of medical reserves:

1. SOURCE FACILITY: ${sourcePhc.name}
2. DEFICIT FACILITY: ${targetPhc.name}
3. ITEM FOR TRANSFER: ${drugName}
4. QUANTITY APPROVED: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

Reasoning: Choutuppal PHC is experiencing an unexpected surge in clinical demand while Ramannapet/Bhongir holds an accessible surplus.

Dispatch must be initiated within 12 hours. Visual confirmation is required upon arrival.

Signed,
District Medical Officer (DMO)
Yadadri Bhuvanagiri District`,
      hi: `ज़िला स्वास्थ्य अधिकारी कार्यालय
यादाद्रि भुवनगिरी ज़िला, तेलंगाना
संदर्भ: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

आपातकालीन चिकित्सा स्टॉक पुनर्वितरण आदेश

महामारी नियंत्रण नियमों के अंतर्गत, निम्नलिखित चिकित्सा स्टॉक को तुरंत स्थानांतरित करने की स्वीकृति दी जाती है:

1. प्रदाता केंद्र: ${sourcePhc.name}
2. प्राप्तकर्ता केंद्र: ${targetPhc.name}
3. आवश्यक दवा: ${drugName}
4. स्वीकृत मात्रा: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

कारण: ${targetPhc.name} में इस दवा की भारी कमी है, जबकि ${sourcePhc.name} के पास अतिरिक्त स्टॉक उपलब्ध है।

यह हस्तांतरण अगले 12 घंटों के भीतर पूरा किया जाना आवश्यक है।

हस्ताक्षरित,
ज़िला चिकित्सा अधिकारी (DMO)
यादाद्रि भुवनगिरी ज़िला`,
      te: `జిల్లా ఆరోగ్య అధికారి కార్యాలయం
యాదాద్రి భువనగిరి జిల్లా, తెలంగాణ
రెఫరెన్స్: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

అత్యవసర వైద్య నిల్వల పునఃపంపిణీ ఉత్తర్వు

మహమ్మారి నియంత్రణ ప్రోటోకాల్ ప్రకారం, తక్షణమే వైద్య నిల్వలను బదిలీ చేయడానికి ఆదేశాలు జారీ చేయడమైనది:

1. సరఫరా కేంద్రం: ${sourcePhc.name}
2. కొరత ఉన్న కేంద్రం: ${targetPhc.name}
3. బదిలీ చేయాల్సిన మందు: ${drugName}
4. ఆమోదించబడిన పరిమాణం: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

కారణం: ${targetPhc.name} లో మందుల తక్షణ కొరత ఉంది, మరియు ${sourcePhc.name} వద్ద తగినంత అదనపు నిల్వలు ఉన్నాయి.

ఈ బదిలీ ప్రక్రియ 12 గంటల లోపు పూర్తి కావాలి.

సంతకం,
జిల్లా వైద్య అధికారి (DMO)
యాదాద్రి భువనగిరి జిల్లా`,
      mr: `जिल्हा आरोग्य अधिकारी कार्यालय
यादाद्री भुवनगिरी जिल्हा, तेलंगणा
संदर्भ: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

तातडीचा वैद्यकीय साठा पुनर्वितरण आदेश

साथीचा रोग नियंत्रण प्रोटोकॉलनुसार, वैद्यकीय साठा तातडीने हस्तांतरित करण्यास मंजुरी दिली जात आहे:

1. स्त्रोत केंद्र: ${sourcePhc.name}
2. तुटवडा असलेले केंद्र: ${targetPhc.name}
3. हस्तांतरणीय औषध: ${drugName}
4. मंजूर मात्रा: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

कारण: ${targetPhc.name} येथे औषधाचा प्रचंड तुटवडा आहे, तर ${sourcePhc.name} कडे अतिरिक्त साठा उपलब्ध आहे.

१२ तासांच्या आत साठा रवाना करावा.

स्वाक्षरी,
जिल्हा वैद्यकीय अधिकारी (DMO)
यादाद्री भुवनगिरी जिल्हा`,
      bn: `জেলা স্বাস্থ্য আধিকারিক কার্যালয়
যাদাদ্রি ভুবনগিরি জেলা, তেলেঙ্গানা
রেফারেন্স: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

জরুরি চিকিৎসা স্টক পুনবন্টন আদেশ

মহামারী নিয়ন্ত্রণ প্রোটোকল অনুযায়ী, অবিলম্বে চিকিৎসা সরঞ্জাম স্থানান্তরের নির্দেশ জারি করা হচ্ছে:

1. সরবরাহকারী কেন্দ্র: ${sourcePhc.name}
2. ঘাটতি সম্পন্ন কেন্দ্র: ${targetPhc.name}
3. স্থানান্তরিত ঔষধ: ${drugName}
4. অনুমোদিত পরিমাণ: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

কারণ: ${targetPhc.name} তে ঔষধের তীব্র ঘাটতি দেখা দিয়েছে, এবং ${sourcePhc.name} এ অতিরিক্ত স্টক মজুত রয়েছে।

১২ ঘণ্টার মধ্যে এই স্থানান্তর সম্পন্ন করতে হবে।

স্বাক্ষরিত,
জেলা চিকিৎসা আধিকারিক (DMO)
যাদাদ্রি ভুবনগিরি জেলা`,
      kn: `ಜಿಲ್ಲಾ ಆರೋಗ್ಯ ಅಧಿಕಾರಿ ಕಾರ್ಯಾಲಯ
ಯಾದಾದ್ರಿ ಭುವನಗಿರಿ ಜಿಲ್ಲೆ, ತೆಲಂಗಾಣ
ಉಲ್ಲೇಖ: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

ತುರ್ತು ವೈದ್ಯಕೀಯ ಸ್ಟಾಕ್ ಮರುಹಂಚಿಕೆ ಆದೇಶ

ಸಾಂಕ್ರಾಮಿಕ ರೋಗ ನಿಯಂತ್ರಣ ಪ್ರೋಟೋಕಾಲ್ ಪ್ರಕಾರ, ವೈದ್ಯಕೀಯ ನಿಲ್ವಗಳನ್ನು ತುರ್ತಾಗಿ ಸ್ಥಳಾಂತರಿಸಲು ಅನುಮತಿ ನೀಡಲಾಗಿದೆ:

1. ಮೂಲ ಕೇಂದ್ರ: ${sourcePhc.name}
2. ಕೊರತೆ ಇರುವ ಕೇಂದ್ರ: ${targetPhc.name}
3. ವರ್ಗಾವಣೆ ಮಾಡಬೇಕಾದ ಔಷಧಿ: ${drugName}
4. ಮಂಜೂರಾದ ಪ್ರಮಾಣ: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

ಕಾರಣ: ${targetPhc.name} ನಲ್ಲಿ ತುರ್ತು ಔಷಧಿ ಕೊರತೆಯಿದೆ, ಮತ್ತು ${sourcePhc.name} ನಲ್ಲಿ ಸಾಕಷ್ಟು ಹೆಚ್ಚುವರಿ ಸ್ಟಾಕ್ ಲಭ್ಯವಿದೆ.

ಈ ವರ್ಗಾವಣೆಯನ್ನು 12 ಗಂಟೆಗಳ ಒಳಗೆ ಪೂರ್ಣಗೊಳಿಸಬೇಕು.

ಸಹಿ,
ಜಿಲ್ಲಾ ವೈದ್ಯಕೀಯ ಅಧಿಕಾರಿ (DMO)
ಯಾದಾದ್ರಿ ಭುವನಗಿರಿ ಜಿಲ್ಲೆ`,
      ta: `மாவட்ட சுகாதார அலுவலர் அலுவலகம்
யாதாத்ரி புவனகிரி மாவட்டம், தெலுங்கானா
குறிப்பு: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

அவசர மருத்துவ இருப்பு மறுபகிர்வு உத்தரவு

தொற்றுநோய் கட்டுப்பாட்டு நெறிமுறையின்படி, மருத்துவ இருப்புகளை அவசரமாக இடமாற்றம் செய்ய ஒப்புதல் வழங்கப்படுகிறது:

1. இருப்பு வழங்கும் மையம்: ${sourcePhc.name}
2. பற்றாக்குறை உள்ள மையம்: ${targetPhc.name}
3. மாற்றப்பட வேண்டிய மருந்து: ${drugName}
4. அங்கீகரிக்கப்பட்ட அளவு: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

காரணம்: ${targetPhc.name} மையத்தில் மருந்து பற்றாக்குறை உள்ளது, அதே நேரத்தில் ${sourcePhc.name} மையத்தில் கூடுதல் இருப்பு உள்ளது.

இடமாற்றம் 12 மணி நேரத்திற்குள் முடிக்கப்பட வேண்டும்.

கையொப்பம்,
மாவட்ட மருத்துவ அலுவலர் (DMO)
யாதாத்ரி புவனகிரி மாவட்டம்`,
      ml: `ജില്ലാ ആരോഗ്യ ഓഫീസർ കാര്യാലയം
യാദാദ്രി ഭുവനഗിരി ജില്ല, തെലങ്കാന
റഫറൻസ്: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

അടിയന്തിര മെഡിക്കൽ സ്റ്റോക്ക് പുനർവിതരണ ഉത്തരവ്

പകർച്ചവ്യാധി നിയന്ത്രണ പ്രോട്ടോക്കോൾ അനുസരിച്ച്, മെഡിക്കൽ സ്റ്റോക്ക് അടിയന്തിരമായി കൈമാറാൻ അനുമതി നൽകുന്നു:

1. സ്രോതസ്സ് കേന്ദ്രം: ${sourcePhc.name}
2. കമ്മി നേരിടുന്ന കേന്ദ്രം: ${targetPhc.name}
3. കൈമാറ്റം ചെയ്യേണ്ട മരുന്ന്: ${drugName}
4. അനുവദിച്ച അളവ്: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

കാരണം: ${targetPhc.name} ൽ മരുന്നിന് അടിയന്തിര കുറവുണ്ട്, കൂടാതെ ${sourcePhc.name} ൽ ആവശ്യത്തിന് അധിക സ്റ്റോക്ക് ലഭ്യമാണ്.

കൈമാറ്റം 12 മണിക്കൂറിനുള്ളിൽ പൂർത്തിയാക്കണം.

ഒപ്പ്,
ജില്ലാ മെഡിക്കൽ ഓഫീസർ (DMO)
യാദാദ്രി ഭുവനഗിരി ജില്ല`,
      gu: `જીલ્લા આરોગ્ય અધિકારી કચેરી
યાદાદ્રી ભુવનગિરી જીલ્લો, તેલંગાણા
સંદર્ભ: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

તાકીદની તબીબી સ્ટોક પુનઃવિતરણ ઓર્ડર

રોગચાળા નિયંત્રણ પ્રોટોકોલ અનુસાર, તબીબી સ્ટોકને તાત્કાલિક સ્થાનાંતરિત કરવાની મંજૂરી આપવામાં આવે છે:

1. પ્રદાતા કેન્દ્ર: ${sourcePhc.name}
2. અછત ધરાવતું કેન્દ્ર: ${targetPhc.name}
3. સ્થાનાંતરિત દવા: ${drugName}
4. મંજૂર જથ્થો: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

કારણ: ${targetPhc.name} માં દવાની તાકીદની અછત છે, જ્યારે ${sourcePhc.name} પાસે પૂરતો વધારાનો જથ્થો છે.

આ સ્થાનાંતરણ 12 કલાકમાં પૂર્ણ થવું જોઈએ.

સહી,
જીલ્લા તબીબી અધિકારી (DMO)
યાદાદ્રી ભુવનગિરી જીલ્લો`,
      pa: `ਜ਼ਿਲ੍ਹਾ ਸਿਹਤ ਅਧਿਕਾਰੀ ਦਫ਼ਤਰ
ਯਾਦਾਦਰੀ ਭੁਵਨਗਿਰੀ ਜ਼ਿਲ੍ਹਾ, ਤੇਲੰਗਾਨਾ
ਹਵਾਲਾ: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

ਹੰਗਾਮੀ ਮੈਡੀਕਲ ਸਟਾਕ ਮੁੜ-ਵੰਡ ਆਰਡਰ

ਮਹਾਂਮਾਰੀ ਨਿਯੰਤਰਣ ਪ੍ਰੋਟੋਕੋਲ ਦੇ ਅਨੁਸਾਰ, ਮੈਡੀਕਲ ਰਿਜ਼ਰਵ ਨੂੰ ਤੁਰੰਤ ਤਬਦੀਲ ਕਰਨ ਦੀ ਮਨਜ਼ੂਰੀ ਦਿੱਤੀ ਜਾਂਦੀ ਹੈ:

1. ਸ੍ਰੋਤ ਕੇਂਦਰ: ${sourcePhc.name}
2. ਘਾਟ ਵਾਲਾ ਕੇਂਦਰ: ${targetPhc.name}
3. ਟ੍ਰਾਂਸਫਰ ਕੀਤੀ ਜਾਣ ਵਾਲੀ ਦਵਾਈ: ${drugName}
4. ਪ੍ਰਵਾਨਿਤ ਮਾਤਰਾ: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

ਕਾਰਨ: ${targetPhc.name} ਵਿਖੇ ਦਵਾਈ ਦੀ ਭਾਰੀ ਘਾਟ ਹੈ, ਜਦੋਂ ਕਿ ${sourcePhc.name} ਕੋਲ ਵਾਧੂ ਸਟਾਕ ਮੌਜੂਦ ਹੈ.

ਟ੍ਰਾਂਸਫਰ 12 ਘੰਟਿਆਂ ਦੇ ਅੰਦਰ ਪੂਰਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ.

ਦਸਤਖਤ,
ਜ਼ਿਲ੍ਹਾ ਮੈਡੀਕਲ ਅਫ਼ਸਰ (DMO)
ਯਾਦਾਦਰੀ ਭੁਵਨਗਿਰੀ ਜ਼ਿਲ੍ਹਾ`,
      or: `ଜିଲ୍ଲା ସ୍ୱାସ୍ଥ୍ୟ ଅଧିକାରୀ କାର୍ଯ୍ୟାଳୟ
ଯାଦାଦ୍ରି ଭୁବନଗିରି ଜିଲ୍ଲା, ତେଲେଙ୍ଗାନା
ସନ୍ଦର୍ଭ: YDR/DHO/2026/TX-${Math.floor(Math.random()*899)+100}

ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା ସାମଗ୍ରୀ ପୁନର୍ବଣ୍ଟନ ନିର୍ଦ୍ଦେଶନାମା

ମହାମାରୀ ନିୟନ୍ତ୍ରଣ ପ୍ରୋଟୋକଲ୍ ଅନୁଯାୟୀ, ଚିକିତ୍ସା ସାମଗ୍ରୀକୁ ଜରୁରୀ ସ୍ଥାନାନ୍ତର ପାଇଁ ଅନୁମତି ଦିଆଗଲା:

1. ପ୍ରଦାନକାରୀ କେନ୍ଦ୍ର: ${sourcePhc.name}
2. ଅଭାବ ଥିବା କେନ୍ଦ୍ର: ${targetPhc.name}
3. ସ୍ଥାନାନ୍ତର ହେବାକୁ ଥିବା ଔଷଧ: ${drugName}
4. ମଞ୍ଜୁରୀପ୍ରାପ୍ତ ପରିମାଣ: ${quantity} ${targetPhc.stock[drugName]?.unit || 'Units'}

କାରଣ: ${targetPhc.name} ଠାରେ ଔଷଧର ଅଭାବ ଦେଖାଦେଇଛି, ଯେଉଁଠି ${sourcePhc.name} ପାଖରେ ପର୍ଯ୍ୟାପ୍ତ ଅତିରିକ୍ତ ସାମଗ୍ରୀ ମହଜୁଦ ଅଛି ।

ଏହି ସ୍ଥାନାନ୍ତର ୧୨ ଘଣ୍ଟା ମଧ୍ୟରେ ଶେଷ ହେବା ଆବଶ୍ୟକ ।

ସ୍ୱାକ୍ଷର,
ଜିଲ୍ଲା ମେଡିକାଲ୍ ଅଫିସର୍ (DMO)
ଯାଦାଦ୍ରି ଭୁବନଗିରି ଜିଲ୍ଲା`
    };

    return drafts[language] || drafts['en'];
  };

  if (ai && !manualSimulationOverride) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${systemPrompt}\n\n${userPrompt}`,
      });

      const draftText = response.text || localFallbackDraft();
      return res.json({
        success: true,
        draftText,
        aiGenerated: true
      });
    } catch (error) {
      console.error("Gemini stock draft failed, using offline template:", error);
      return res.json({
        success: true,
        draftText: localFallbackDraft(),
        aiGenerated: false,
        warning: "Operating in offline simulation mode."
      });
    }
  } else {
    return res.json({
      success: true,
      draftText: localFallbackDraft(),
      aiGenerated: false,
      simulationMode: true
    });
  }
});

// POST /api/phcs/redistribute-approve - Execute the transfer in database in real-time!
app.post("/api/phcs/redistribute-approve", (req, res) => {
  const { sourcePhcId, targetPhcId, drugName, quantity } = req.body;

  if (!sourcePhcId || !targetPhcId || !drugName || !quantity) {
    return res.status(400).json({ error: "Missing transfer credentials." });
  }

  const sourcePhc = phcs.find(p => p.id === sourcePhcId);
  const targetPhc = phcs.find(p => p.id === targetPhcId);

  if (!sourcePhc || !targetPhc) {
    return res.status(404).json({ error: "Source or Target facility not found." });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "Invalid transfer quantity." });
  }

  // Deduct from source
  if (sourcePhc.stock[drugName]) {
    sourcePhc.stock[drugName].current = Math.max(0, sourcePhc.stock[drugName].current - qty);
  }

  // Add to target
  if (targetPhc.stock[drugName]) {
    targetPhc.stock[drugName].current += qty;
  } else {
    targetPhc.stock[drugName] = {
      current: qty,
      minRequired: 50,
      unit: "Units"
    };
  }

  // Append to Transfer Logs list
  const newLog = {
    id: `tx-${Math.floor(Math.random() * 900000) + 100000}`,
    timestamp: new Date().toISOString(),
    sourcePhcName: sourcePhc.name,
    targetPhcName: targetPhc.name,
    drugName,
    quantity: qty,
    status: "Approved" as const
  };

  transferLogs.unshift(newLog);

  res.json({
    success: true,
    message: `Successfully transferred ${qty} of ${drugName} from ${sourcePhc.name} to ${targetPhc.name}.`,
    transferLogs,
    phcs
  });
});

// POST /api/phcs/explain-forecast - Explains forecasting spikes with Gemini Reasoning layer
app.post("/api/phcs/explain-forecast", async (req, res) => {
  const { phcId, symptom, score, currentLevel, language = 'en' } = req.body;

  if (!phcId || !symptom) {
    return res.status(400).json({ error: "Missing phcId or symptom selection." });
  }

  const phc = phcs.find(p => p.id === phcId);
  if (!phc) {
    return res.status(404).json({ error: "PHC not found." });
  }

  const rainMax = Math.max(...phc.rainfallHistory);
  const tempAvg = Math.round(phc.tempHistory.reduce((a, b) => a + b, 0) / 14);

  const langNames: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    te: "Telugu",
    mr: "Marathi",
    bn: "Bengali",
    kn: "Kannada",
    ta: "Tamil",
    ml: "Malayalam",
    gu: "Gujarati",
    pa: "Punjabi",
    or: "Odia"
  };
  const selectedLangName = langNames[language] || "English";

  const systemPrompt = `You are an expert clinical epidemiologist. Provide a single, extremely powerful, one-sentence plain-language explanation/justification of why this disease spike is forecasted.
Explain in terms of underlying clinical features like recent rainfall spikes, rising symptom trend counts, bed counts, and historical lag correlations.
Do NOT sound like a generic AI block. Sound like professional reasoning.
The output MUST be written entirely in ${selectedLangName} language as requested. Keep the response to exactly one sentence.`;

  const userPrompt = `Facility Name: ${phc.name}
Disease Symptom: ${symptom}
Risk Score: ${score}/100
Current Daily Count: ${currentLevel} cases
Rainfall Trend: Max rainfall reached ${rainMax}mm in the last 10 days.
Temperature: Average ${tempAvg}°C.
Doctor Attendance: ${phc.doctorAttendance}%
Beds Available: ${phc.bedsAvailable}/${phc.bedsTotal}`;

  const localFallbackExplanation = () => {
    const explanations: Record<string, Record<string, string>> = {
      en: {
        "Fever": `Rainfall spike of ${rainMax}mm 9 days ago paired with rising fever cases (+15% slope) and critically low Paracetamol inventory creates a compounding vector risk.`,
        "Diarrhea": `Extreme temperature of ${tempAvg}°C combined with a 2x increase in waterborne symptoms and low ORS stock triggers a critical warning for water safety.`,
        "Malaria": `Stagnant water pools from recent rains of ${rainMax}mm have accelerated mosquito breeding, causing Malaria cases to quadruple with a 10-day lag.`,
        "Rash": `Symptom history displays a localized infectious trend while sub-optimal doctor attendance hinders active screening and rapid diagnosis.`
      },
      hi: {
        "Fever": `९ दिन पहले हुई ${rainMax}mm बारिश के साथ बुखार के बढ़ते मामले और पैरासिटामोल के खाली पड़े स्टॉक के कारण स्वास्थ्य जोखिम अत्यधिक बढ़ गया है।`,
        "Diarrhea": `औसत तापमान ${tempAvg}°C होने तथा पानी से होने वाली बीमारियों के मामलों में वृद्धि और ओआरएस स्टॉक की गंभीर कमी से जल सुरक्षा चेतावनी सक्रिय हो गई है।`,
        "Malaria": `हाल ही में हुई ${rainMax}mm बारिश से जमे हुए पानी के कारण मच्छरों का प्रजनन बढ़ा है, जिससे १० दिनों के भीतर मलेरिया के मामले चार गुना बढ़ गए हैं।`,
        "Rash": `कम डॉक्टर उपस्थिति के कारण स्थानीय स्तर पर तेजी से फैलते रैश संक्रमण की निगरानी और समय पर निदान में रुकावट आ रही है।`
      },
      te: {
        "Fever": `9 రోజుల క్రితం కురిసిన ${rainMax}mm వర్షం, పెరుగుతున్న జ్వరాల కేసులు మరియు పారాసిటమాల్ కొరత తీవ్రమైన హెల్త్ రిస్క్‌ను సృష్టిస్తున్నాయి.`,
        "Diarrhea": `${tempAvg}°C అధిక ఉష్ణోగ్రత, డయేరియా కేసుల పెరుగుదల మరియు ORS ప్యాకెట్ల కొరత కారణంగా తాగునీటి కాలుష్య నివారణ చర్యలు అత్యవసరమయ్యాయి.`,
        "Malaria": `${rainMax}mm వర్షపాతం వల్ల నీరు నిలిచిపోవడం దోమల వృద్ధికి దారితీసింది, ఫలితంగా మలేరియా కేసులు 10 రోజుల్లో నాలుగు రెట్లు పెరిగాయి.`,
        "Rash": `డాక్టర్ల హాజరు శాతం తక్కువగా ఉండటం వల్ల వ్యాప్తి చెందుతున్న చర్మ దద్దుర్లు ముందస్తు గుర్తింపునకు ఆటంకం కలుగుతోంది.`
      },
      mr: {
        "Fever": `९ दिवसांपूर्वी झालेल्या ${rainMax}mm पावसामुळे आणि तापाच्या वाढत्या रुग्णांमुळे पॅरासिटामॉलच्या कमतरतेसह गंभीर आरोग्य धोका निर्माण झाला आहे.`,
        "Diarrhea": `${tempAvg}°C तापमान वाढ, अतिसाराच्या वाढत्या केसेस आणि ओआरएस साठ्यातील तुटवड्यामुळे जलसुरक्षा चेतावणी देण्यात आली आहे.`,
        "Malaria": `${rainMax}mm पावसानंतर साचलेल्या पाण्यामुळे डासांची पैदास वाढली असून १० दिवसांत मलेरियाचे रुग्ण वेगाने वाढले आहेत.`,
        "Rash": `कमी डॉक्टर उपस्थितीमुळे पसरणाऱ्या रॅश संसर्गाचे वेळेत निदान आणि नियंत्रण करण्यात अडथळे येत आहेत.`
      },
      bn: {
        "Fever": `৯ দিন আগে হওয়া ${rainMax}mm বৃষ্টি এবং ক্রমবর্ধমান জ্বরের সাথে প্যারাসিটামলের তীব্র ঘাটতি মারাত্মক স্বাস্থ্য ঝুঁকি সৃষ্টি করেছে।`,
        "Diarrhea": `${tempAvg}°C গড় তাপমাত্রা বৃদ্ধি, ডায়রিয়ার প্রকোপ এবং ওআরএস প্যাকেটের স্বল্পতার কারণে জরুরি পানীয় জল সুরক্ষার প্রয়োজনীয়তা তৈরি হয়েছে।`,
        "Malaria": `${rainMax}mm বৃষ্টির জল জমে থাকার কারণে মশার প্রজনন বৃদ্ধি পেয়েছে, যার ফলে ১০ দিনের ব্যবধানে ম্যালেরিয়া ৪ গুণ বেড়েছে।`,
        "Rash": `ডাক্তারের উপস্থিতি কম থাকার কারণে ছড়িয়ে পড়া চর্মরোগের দ্রুত সনাক্তকরণ ও চিকিৎসা ব্যাহত হচ্ছে।`
      }
    };

    const phcExps = explanations[language] || explanations['en'];
    return phcExps[symptom] || phcExps["Fever"];
  };

  if (ai && !manualSimulationOverride) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${systemPrompt}\n\n${userPrompt}`,
      });

      const explanation = response.text?.trim() || localFallbackExplanation();
      return res.json({
        success: true,
        explanation,
        aiGenerated: true
      });
    } catch (error) {
      console.error("Gemini Explanation layer failed, using local model:", error);
      return res.json({
        success: true,
        explanation: localFallbackExplanation(),
        aiGenerated: false,
        warning: "Operating with local rule fallback."
      });
    }
  } else {
    return res.json({
      success: true,
      explanation: localFallbackExplanation(),
      aiGenerated: false,
      simulationMode: true
    });
  }
});

// Vite & Static file serve logic
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();