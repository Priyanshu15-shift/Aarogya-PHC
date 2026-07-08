import { useState, useEffect, useRef, useMemo, DragEvent, ChangeEvent } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Database,
  FileCheck,
  FileText,
  Globe,
  Info,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Check,
  Droplets,
  Thermometer,
  AlertCircle,
  Layers
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { PHCData, DigitizedRecord, ForecastResult, Language } from "./types";
import EpidemiologicalGoogleMap from "./components/EpidemiologicalGoogleMap";

// Type definitions matching the server structure
interface ClientPHCData extends PHCData {
  forecasts: ForecastResult[];
  riskAnalysis: {
    phcId: string;
    score: number;
    status: 'red' | 'amber' | 'green';
    reasons: string[];
  };
}

interface ServerResponse {
  phcs: ClientPHCData[];
  transferLogs: Array<{
    id: string;
    timestamp: string;
    sourcePhcName: string;
    targetPhcName: string;
    drugName: string;
    quantity: number;
    status: 'Approved' | 'Pending';
  }>;
  simulationMode: boolean;
}

// Complete dictionary of translations for professional hackathon-level presentation
const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    title: "Aarogya-PHC",
    subtitle: "Uttar Pradesh State Health Command & Resource Grid",
    simulationNotice: "Simulation Mode: Gemini API Key inactive. Using rule-based local model.",
    activeEngine: "Gemini DMO AI Engine Active",
    resetBtn: "Reset Data Model",
    dashboardTab: "Telemetry & Forecasts",
    digitizationTab: "Photo Digitizer (OCR)",
    redistributionTab: "Stock Redistribution",
    districtOverview: "District Command View",
    autoFlagging: "Automatic Risk Flagging",
    searchPlaceholder: "Search facilities, symptoms, or location...",
    facilityView: "Facility Clinical View",
    facilityDetail: "Facility Operations & Epidemic Forecast",
    digitizerTitle: "Register Photo Digitization",
    digitizerDesc: "Convert handwritten medical logs to ledger using Gemini Multimodal OCR",
    redistributionTitle: "Smart Resource Redistribution",
    redistributionDesc: "AI-driven stock-out mitigations across district facilities",
    languageLabel: "Language",
    riskScore: "Risk Score",
    statusRed: "CRITICAL",
    statusAmber: "WATCH",
    statusGreen: "STABLE",
    doctorAttendance: "DMO Attendance",
    availableBeds: "Beds Available",
    testKits: "Test Kits",
    drugInventory: "Core Drug Inventory",
    forecastsHeader: "14-Day Epidemic Forecast Horizon",
    explainBtn: "Explain with Gemini Reasoning",
    explanationTitle: "Gemini Clinical Explanation",
    transferProposal: "Redistribution Recommendation",
    transferSource: "Surplus Source Facility",
    transferTarget: "Deficit Target Facility",
    transferItem: "Transfer Drug",
    transferQty: "Redistribution Quantity",
    reasonLabel: "Urgent Administrative Reason",
    draftOrderBtn: "Draft Government Transfer Order",
    draftingState: "Drafting Official Order via Gemini...",
    approveOrderBtn: "Approve & Execute Transfer",
    approvedLogs: "Verified Transfer Ledger",
    selectPhcPrompt: "Select a facility from the district command panel to inspect live telemetry.",
    fever: "Fever",
    diarrhea: "Diarrhea",
    malaria: "Malaria",
    rash: "Rash",
    uploadPlaceholder: "Drag and drop register image here, or click to select",
    uploadSampleBtn: "Use Sample Monsoon Register",
    uploadSampleBtn2: "Use Sample Diarrhea Register",
    digitizingState: "Gemini OCR digitizing and parsing strictly structured JSON...",
    digitizedTableTitle: "Extracted Patient Logs Ledger",
    commitLedgerBtn: "Confirm & Commit to District database",
    symptomTrend: "14-Day Epidemic Trend Line Chart",
    correlationNotice: "Weather Correlation: Heavy rainfall spikes (8-10 days lag) are mapped to vector peaks.",
    environmentalIndicators: "Environmental & Climate Lag Telemetry",
    avgTemp: "Avg Temperature",
    maxRain: "Max Rainfall"
  },
  hi: {
    title: "Aarogya-PHC",
    subtitle: "उत्तर प्रदेश राज्य स्वास्थ्य कमान एवं संसाधन ग्रिड",
    simulationNotice: "सिमुलेशन मोड: जेमिनी एपीआई कुंजी निष्क्रिय है। स्थानीय एल्गोरिदम का उपयोग किया जा रहा है।",
    activeEngine: "जेमिनी डीएमओ एआई इंजन सक्रिय",
    resetBtn: "डेटा मॉडल रीसेट करें",
    dashboardTab: "क्लिनिकल टेलीमेट्री",
    digitizationTab: "फोटो डिजिटाइज़र",
    redistributionTab: "स्टॉक पुनर्वितरण",
    districtOverview: "ज़िला कमान दृश्य",
    autoFlagging: "स्वचालित जोखिम फ्लैगिंग",
    searchPlaceholder: "केंद्र, लक्षण या स्थान खोजें...",
    facilityView: "केंद्र नैदानिक दृश्य",
    facilityDetail: "केंद्र संचालन और महामारी पूर्वानुमान",
    digitizerTitle: "रजिस्टर फोटो डिजिटलीकरण",
    digitizerDesc: "जेमिनी मल्टीमॉडल ओसीआर का उपयोग कर हस्तलिखित रजिस्टर को डिजिटल लेजर में बदलें",
    redistributionTitle: "स्मार्ट संसाधन पुनर्वितरण",
    redistributionDesc: "ज़िला केंद्रों के बीच एआई-संचालित स्टॉक-आउट शमन",
    languageLabel: "भाषा",
    riskScore: "जोखिम सूचकांक",
    statusRed: "गंभीर (क्रिटिकल)",
    statusAmber: "निगरानी (वॉच)",
    statusGreen: "स्थिर (स्टेबल)",
    doctorAttendance: "चिकित्सक उपस्थिति",
    availableBeds: "उपलब्ध बेड",
    testKits: "जांच किट",
    drugInventory: "मुख्य दवा स्टॉक",
    forecastsHeader: "14-दिवसीय महामारी पूर्वानुमान क्षितिज",
    explainBtn: "जेमिनी रीजनिंग से स्पष्ट करें",
    explanationTitle: "जेमिनी क्लिनिकल स्पष्टीकरण",
    transferProposal: "पुनर्वितरण अनुशंसा",
    transferSource: "अतिरिक्त स्टॉक वाला केंद्र",
    transferTarget: "कमी वाला केंद्र",
    transferItem: "स्थानांतरित दवा",
    transferQty: "पुनर्वितरण मात्रा",
    reasonLabel: "त्वरित प्रशासनिक कारण",
    draftOrderBtn: "प्रशासकीय सरकारी आदेश ड्राफ्ट करें",
    draftingState: "जेमिनी के माध्यम से सरकारी आदेश तैयार किया जा रहा है...",
    approveOrderBtn: "स्वीकृत करें और स्थानांतरण निष्पादित करें",
    approvedLogs: "सत्यापित स्थानांतरण बहीखाता (लेजर)",
    selectPhcPrompt: "लाइव टेलीमेट्री का निरीक्षण करने के लिए जिला कमांड पैनल से एक केंद्र का चयन करें।",
    fever: "बुखार",
    diarrhea: "अतिसार (डायरिया)",
    malaria: "मलेरिया",
    rash: "त्वचा संक्रमण (रैश)",
    uploadPlaceholder: "हस्तलिखित रजिस्टर की तस्वीर यहाँ खींचें या अपलोड करें",
    uploadSampleBtn: "मानसूनी बुखार सैंपल का उपयोग करें",
    uploadSampleBtn2: "डायरिया सैंपल का उपयोग करें",
    digitizingState: "जेमिनी ओसीआर हस्तलिखित रिकॉर्ड को स्ट्रक्चर्ड JSON में परिवर्तित कर रहा है...",
    digitizedTableTitle: "निकाले गए मरीज लॉग लेजर",
    commitLedgerBtn: "पुष्टि करें और जिला डेटाबेस में सेव करें",
    symptomTrend: "14-दिवसीय महामारी प्रवृत्ति चार्ट",
    correlationNotice: "मौसम सहसंबंध: भारी बारिश (8-10 दिन बाद) मच्छरों के प्रजनन और बुखार को बढ़ाती है।",
    environmentalIndicators: "पर्यावरणीय एवं जलवायु टेलीमेट्री",
    avgTemp: "औसत तापमान",
    maxRain: "अधिकतम वर्षा"
  },
  te: {
    title: "Aarogya-PHC",
    subtitle: "ఉత్తర ప్రదేశ్ రాష్ట్ర ఆరోగ్య కమాండ్ & వనరుల గ్రిడ్",
    simulationNotice: "సిమ్యులేషన్ మోడ్: జెమిని API కీ నిష్క్రియంగా ఉంది. లోకల్ రూల్-బేస్డ్ మోడల్ వాడుతోంది.",
    activeEngine: "జెమిని DMO AI ఇంజన్ సక్రియంగా ఉంది",
    resetBtn: "డేటాను రీసెట్ చేయండి",
    dashboardTab: "క్లినికల్ టెలిమెట్రీ",
    digitizationTab: "ఫోటో డిజిటలైజర్",
    redistributionTab: "స్టాక్ పునఃపంపిణీ",
    districtOverview: "జిల్లా కమాండ్ డ్యాష్‌బోర్డ్",
    autoFlagging: "ఆటోమేటిక్ రిస్క్ ఫ్లాగింగ్",
    searchPlaceholder: "ఆసుపత్రి, లక్షణం లేదా ప్రాంతాన్ని వెతకండి...",
    facilityView: "వైద్య కేంద్ర క్లినికల్ వ్యూ",
    facilityDetail: "కేంద్ర నిర్వహణ & అంటువ్యాధుల అంచనా",
    digitizerTitle: "రిజిస్టర్ ఫోటో డిజిటలైజేషన్",
    digitizerDesc: "జెమిని మల్టీమోడల్ OCR ఉపయోగించి చేతిరాత రిజిస్టర్లను డిజిటల్ లెడ్జర్‌గా మార్చండి",
    redistributionTitle: "స్మార్ట్ రిసోర్స్ పునఃపంపిణీ",
    redistributionDesc: "జిల్లా కేంద్రాల మధ్య AI ఆధారిత మందుల కొరత నివారణ",
    languageLabel: "భాష",
    riskScore: "ప్రమాద స్కోర్",
    statusRed: "అత్యవసరం (CRITICAL)",
    statusAmber: "పర్యవేక్షణ (WATCH)",
    statusGreen: "సురక్షితం (STABLE)",
    doctorAttendance: "వైద్యుల హాజరు",
    availableBeds: "అందుబాటులో ఉన్న బెడ్లు",
    testKits: "టెస్ట్ కిట్లు",
    drugInventory: "ప్రధాన ఔషధ నిల్వలు",
    forecastsHeader: "14-రోజుల అంటువ్యాధుల హెచ్చరికల సూచిక",
    explainBtn: "జెమిని విశ్లేషణను పొందండి",
    explanationTitle: "జెమిని క్లినికల్ వివరణ",
    transferProposal: "ఔషధ నిల్వల బదిలీ ప్రతిపాదన",
    transferSource: "అదనపు నిల్వలు ఉన్న కేంద్రం",
    transferTarget: "కొరత ఎదుర్కొంటున్న కేంద్రం",
    transferItem: "బదిలీ చేయాల్సిన మందు",
    transferQty: "బదిలీ చేయాల్సిన పరిమాణం",
    reasonLabel: "అత్యవసర పరిపాలనా కారణం",
    draftOrderBtn: "ప్రభుత్వ అధికారిక బదిలీ ఉత్తర్వు రాయండి",
    draftingState: "జెమిని ద్వారా అధికారిక జీవో రూపకల్పన జరుగుతోంది...",
    approveOrderBtn: "ఆమోదించి బదిలీని పూర్తి చేయండి",
    approvedLogs: "ధృవీకరించబడిన నిల్వల బదిలీ ఖాతా",
    selectPhcPrompt: "ప్రత్యక్ష సమాచారాన్ని పరిశీలించడానికి జిల్లా కమాండ్ ప్యానెల్ నుండి ఒక కేంద్రాన్ని ఎంచుకోండి.",
    fever: "జ్వరం",
    diarrhea: "విరేచనాలు",
    malaria: "మలేరియా",
    rash: "చర్మ దద్దుర్లు (రష్)",
    uploadPlaceholder: "చేతిరాత రిజిస్టర్ ఫోటోను ఇక్కడ డ్రాప్ చేయండి లేదా అప్‌లోడ్ చేయండి",
    uploadSampleBtn: "వర్షాకాలపు సాంపుల్ రిజిస్టర్ వాడండి",
    uploadSampleBtn2: "డయేరియా సాంపుల్ రిజిస్టర్ వాడండి",
    digitizingState: "జెమిని OCR చేతిరాత సమాచారాన్ని JSON ఫార్మాట్ లోకి మారుస్తోంది...",
    digitizedTableTitle: "సేకరించిన రోగుల వివరాల రిపోర్ట్",
    commitLedgerBtn: "ధృవీకరించి జిల్లా డేటాబేస్ కు చేర్చండి",
    symptomTrend: "14-రోజుల అంటువ్యాధుల విస్తరణ చార్ట్",
    correlationNotice: "వాతావరణ సమన్వయం: భారీ వర్షాలు పడిన 8-10 రోజులలో దోమల విస్తరణ మరియు జ్వరాల పెరుగుదల గమనించవచ్చు.",
    environmentalIndicators: "వాతావరణ మరియు పర్యావరణ సూచీలు",
    avgTemp: "సగటు ఉష్ణోగ్రత",
    maxRain: "గరిష్ట వర్షపాతం"
  },
  mr: {
    title: "जिल्हा आरोग्य कमांड पोर्टल",
    subtitle: "यादाद्री भुवनगिरी जिल्हा, सार्वजनिक आरोग्य प्रशासन",
    simulationNotice: "सिम्युलेशन मोड: जेमिनी एपीआय की निष्क्रिय आहे. स्थानिक अल्गोरिदम वापरला जात आहे.",
    activeEngine: "जेमिनी डीएमओ एआई इंजिन सक्रिय",
    resetBtn: "डेटा रीसेट करा",
    districtOverview: "जिल्हा कमांड व्यू",
    autoFlagging: "स्वयंचलित धोका फ्लॅगिंग",
    searchPlaceholder: "केंद्र, लक्षण किंवा ठिकाण शोधा...",
    facilityView: "केंद्र क्लिनिकल व्यू",
    facilityDetail: "केंद्र संचालन आणि साथीचे रोग अंदाज",
    digitizerTitle: "रजिस्टर फोटो डिजिटलीकरण",
    digitizerDesc: "जेमिनी मल्टीमॉडल ओसीआरद्वारे हस्तलिखित आरोग्य नोंदी डिजिटल लेजरमध्ये रूपांतरित करा",
    redistributionTitle: "स्मार्ट संसाधन पुनर्वितरण",
    redistributionDesc: "जिल्ह्यातील केंद्रांदरम्यान औषधांच्या तुटवड्याचे एआय-आधारित नियोजन",
    languageLabel: "भाषा",
    riskScore: "धोका निर्देशांक",
    statusRed: "गंभीर (CRITICAL)",
    statusAmber: "निगराणी (WATCH)",
    statusGreen: "स्थिर (STABLE)",
    doctorAttendance: "वैद्यकीय अधिकारी उपस्थिती",
    availableBeds: "उपलब्ध खाटा",
    testKits: "चाचणी किट्स",
    drugInventory: "प्रमुख औषध साठा",
    forecastsHeader: "14-दिवसीय साथीचे रोग अंदाज",
    explainBtn: "जेमिनी स्पष्टीकरण मिळवा",
    explanationTitle: "जेमिनी वैद्यकीय स्पष्टीकरण",
    transferProposal: "पुनर्वितरण शिफारस",
    transferSource: "अतिरिक्त साठा असलेले केंद्र",
    transferTarget: "तुटवडा असलेले केंद्र",
    transferItem: "औषधाचे नाव",
    transferQty: "हस्तांतरणीय साठा",
    reasonLabel: "तातडीचे प्रशासकीय कारण",
    draftOrderBtn: "शासकीय हस्तांतरण आदेश मसुदा तयार करा",
    draftingState: "जेमिनीद्वारे अधिकृत शासकीय आदेश तयार केला जात आहे...",
    approveOrderBtn: "मंजूर करा आणि हस्तांतरण करा",
    approvedLogs: "सत्यापित हस्तांतरण लेजर",
    selectPhcPrompt: "थेट माहिती तपासण्यासाठी जिल्हा कमांड पॅनेलमधून एका केंद्राची निवड करा.",
    fever: "ताप",
    diarrhea: "अतिसार (डायरिया)",
    malaria: "मलेरिया",
    rash: "त्वचेचे संसर्ग (रॅश)",
    uploadPlaceholder: "नोंदवहीचा फोटो येथे ड्रॅग आणि ड्रॉप करा किंवा निवडा",
    uploadSampleBtn: "मान्सून ताप सँपल वापरा",
    uploadSampleBtn2: "डायरिया सँपल वापरा",
    digitizingState: "जेमिनी ओसीआर नोंदींचे स्ट्रक्चर्ड JSON मध्ये वर्गीकरण करत आहे...",
    digitizedTableTitle: "पुनर्प्राप्त रुग्ण नोंदी लेजर",
    commitLedgerBtn: "निश्चित करा आणि जिल्हा डेटाबेसमध्ये जतन करा",
    symptomTrend: "14-दिवसीय आजार पसरण्याचा आलेख",
    correlationNotice: "हवामान संबंध: अतिवृष्टी (8-10 दिवसांचा विलंब) डासांची पैदास आणि ताप वाढवते.",
    environmentalIndicators: "पर्यावरणीय आणि हवामान टेलीमेट्री",
    avgTemp: "सरासरी तापमान",
    maxRain: "महिनाभरातील कमाल पाऊस"
  },
  bn: {
    title: "জেলা স্বাস্থ্য কমান্ড পোর্টাল",
    subtitle: "যাদাদ্রি ভুবনগিরি জেলা, জনস্বাস্থ্য প্রশাসন বিভাগ",
    simulationNotice: "সিমুলেশন মোড: জেমিনি এপিআই কি নিষ্ক্রিয়। লোকাল অ্যালগরিদম ব্যবহার করা হচ্ছে।",
    activeEngine: "জেমিনি ডিএমও এআই ইঞ্জিন সক্রিয়",
    resetBtn: "ডেটা রিসেট করুন",
    districtOverview: "জেলা কমান্ড ভিউ",
    autoFlagging: "স্বয়ংক্রিয় ঝুঁকি ফ্ল্যাগিং",
    searchPlaceholder: "কেন্দ্র, উপসর্গ বা এলাকা খুঁজুন...",
    facilityView: "কেন্দ্র ক্লিনিক্যাল ভিউ",
    facilityDetail: "কেন্দ্র পরিচালনা ও মহামারী পূর্বাভাস",
    digitizerTitle: "রেজিস্টার ফটো ডিজিটাইজেশন",
    digitizerDesc: "জেমিনি মাল্টিমোডাল ওসিআর ব্যবহার করে হাতে লেখা রেজিস্টার ডিজিটাল লেজারে রূপান্তর করুন",
    redistributionTitle: "স্মার্ট রিসোর্স পুনর্বণ্টন",
    redistributionDesc: "জেলা কেন্দ্রগুলির মধ্যে এআই-চালিত ঔষধের ঘাটতি মেটানো",
    languageLabel: "ভাষা",
    riskScore: "ঝুঁকি সূচক",
    statusRed: "জরুরি (CRITICAL)",
    statusAmber: "নজরদারি (WATCH)",
    statusGreen: "স্থিতিশীল (STABLE)",
    doctorAttendance: "চিকিৎসক উপস্থিতি",
    availableBeds: "উপলব্ধ শয্যা",
    testKits: "টেস্ট কিট",
    drugInventory: "মূল ঔষধ স্টক",
    forecastsHeader: "১৪-দিনের মহামারী পূর্বাভাস",
    explainBtn: "জেমিনি বিশ্লেষণ পান",
    explanationTitle: "জেমিনি ক্লিনিক্যাল ব্যাখ্যা",
    transferProposal: "পুনর্বণ্টন সুপারিশ",
    transferSource: "উদ্বৃত্ত স্টক কেন্দ্র",
    transferTarget: "ঘাটতি সম্পন্ন কেন্দ্র",
    transferItem: "স্থানান্তরিত ঔষধ",
    transferQty: "পুনর্বণ্টনের পরিমাণ",
    reasonLabel: "জরুরি প্রশাসনিক কারণ",
    draftOrderBtn: "প্রশাসনিক স্থানান্তর আদেশ খসড়া তৈরি করুন",
    draftingState: "জেমিনি দিয়ে সরকারি আদেশপত্র খসড়া করা হচ্ছে...",
    approveOrderBtn: "অনুমোদন করুন এবং স্থানান্তর সম্পন্ন করুন",
    approvedLogs: "অনুমোদিত স্থানান্তর লেজার",
    selectPhcPrompt: "লাইভ টেলিমেট্রি দেখতে জেলা কমান্ড প্যানেল থেকে একটি কেন্দ্র নির্বাচন করুন।",
    fever: "জ্বর",
    diarrhea: "ডায়রিয়া",
    malaria: "ম্যালেরিয়া",
    rash: "চর্মরোগ (র‍্যাশ)",
    uploadPlaceholder: "হাতে লেখা রেজিস্টারের ছবি এখানে ড্রপ বা আপলোড করুন",
    uploadSampleBtn: "বর্ষাকালীন জ্বর স্যাম্পল ব্যবহার করুন",
    uploadSampleBtn2: "ডায়রিয়া স্যাম্পল ব্যবহার করুন",
    digitizingState: "জেমিনি ওসিআর হাতে লেখা রেকর্ডকে স্ট্রাকচার্ড JSON-এ রূপান্তর করছে...",
    digitizedTableTitle: "উদ্ধারকৃত রোগীর বিবরণ লেজার",
    commitLedgerBtn: "অনুমোদন করুন এবং জেলা ডাটাবেসে সেভ করুন",
    symptomTrend: "১৪-দিনের মহামারী বিস্তারের গ্রাফ",
    correlationNotice: "আবহাওয়া সম্পর্ক: ভারী বৃষ্টিপাতের ৮-১০ দিনের মাথায় মশার উপদ্রব এবং জ্বর বৃদ্ধি পায়।",
    environmentalIndicators: "পরিবেশ ও আবহাওয়া টেলিমেট্রি",
    avgTemp: "গড় তাপমাত্রা",
    maxRain: "সর্বোচ্চ বৃষ্টিপাত"
  },
  kn: {
    title: "ಜಿಲ್ಲಾ ಆರೋಗ್ಯ ಕಮಾಂಡ್ ಪೋರ್ಟಲ್",
    subtitle: "ಯಾದಾದ್ರಿ ಭುವನಗಿರಿ ಜಿಲ್ಲೆ, ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ ಆಡಳಿತ",
    simulationNotice: "ಸಿಮ್ಯುಲೇಶನ್ ಮೋಡ್: ಜೆಮಿನಿ API ಕೀ ನಿಷ್ಕ್ರಿಯವಾಗಿದೆ. ಸ್ಥಳೀಯ ಮಾದರಿ ಬಳಸಲಾಗುತ್ತಿದೆ.",
    activeEngine: "ಜೆಮಿನಿ DMO AI ಇಂಜಿನ್ ಸಕ್ರಿಯ",
    resetBtn: "ಡೇಟಾ ಮಾದರಿ ಮರುಹೊಂದಿಸಿ",
    districtOverview: "ಜಿಲ್ಲಾ ಕಮಾಂಡ್ ವ್ಯೂ",
    autoFlagging: "ಸ್ವಯಂಚಾಲಿತ ಅಪಾಯದ ಫ್ಲ್ಯಾಗಿಂಗ್",
    searchPlaceholder: "ಕೇಂದ್ರಗಳು, ಲಕ್ಷಣಗಳು ಅಥವಾ ಸ್ಥಳವನ್ನು ಹುಡುಕಿ...",
    facilityView: "ಕೇಂದ್ರದ ಕ್ಲಿನಿಕಲ್ ವ್ಯೂ",
    facilityDetail: "ಕೇಂದ್ರದ ಕಾರ್ಯಾಚರಣೆಗಳು ಮತ್ತು ಸಾಂಕ್ರಾಮಿಕ ಮುನ್ಸೂಚನೆ",
    digitizerTitle: "ರಿಜಿಸ್ಟರ್ ಫೋಟೋ ಡಿಜಿಟಲೀಕರಣ",
    digitizerDesc: "ಜೆಮಿನಿ ಮಲ್ಟಿಮೋಡಲ್ OCR ಬಳಸಿ ಕೈಬರಹದ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ಡಿಜಿಟಲ್ ಲೆಡ್ಜರ್ ಆಗಿ ಪರಿವರ್ತಿಸಿ",
    redistributionTitle: "ಸ್ಮಾರ್ಟ್ ಸಂಪನ್ಮೂಲ ಮರುಹಂಚಿಕೆ",
    redistributionDesc: "ಜಿಲ್ಲಾ ಕೇಂದ್ರಗಳ ನಡುವೆ AI-ಚಾಲಿತ ಔಷಧಿ ಕೊರತೆ ಶಮನ",
    languageLabel: "ಭಾಷೆ",
    riskScore: "ಅಪಾಯದ ಅಂಕ",
    statusRed: "ತುರ್ತು (CRITICAL)",
    statusAmber: "ಮೇಲ್ವಿಚಾರಣೆ (WATCH)",
    statusGreen: "ಸ್ಥಿರ (STABLE)",
    doctorAttendance: "ವೈದ್ಯರ ಹಾಜರಾತಿ",
    availableBeds: "ಲಭ್ಯವಿರುವ ಹಾಸಿಗೆಗಳು",
    testKits: "ಪರೀಕ್ಷಾ ಕಿಟ್‌ಗಳು",
    drugInventory: "ಮುಖ್ಯ ಔಷಧಿ ದಾಸ್ತಾನು",
    forecastsHeader: "14-ದಿನಗಳ ಸಾಂಕ್ರಾಮಿಕ ಮುನ್ಸೂಚನೆ",
    explainBtn: "ಜೆಮಿನಿ ವಿಶ್ಲೇಷಣೆ ಪಡೆಯಿರಿ",
    explanationTitle: "ಜೆಮಿನಿ ವೈದ್ಯಕೀಯ ವಿವರಣೆ",
    transferProposal: "ಮರುಹಂಚಿಕೆ ಶಿಫಾರಸು",
    transferSource: "ಹೆಚ್ಚುವರಿ ದಾಸ್ತಾನು ಇರುವ ಕೇಂದ್ರ",
    transferTarget: "ಕೊರತೆ ಇರುವ ಕೇಂದ್ರ",
    transferItem: "ವರ್ಗಾವಣೆ ಔಷಧಿ",
    transferQty: "ವರ್ಗಾವಣೆ ಪ್ರಮಾಣ",
    reasonLabel: "ತುರ್ತು ಆಡಳಿತಾತ್ಮಕ ಕಾರಣ",
    draftOrderBtn: "ಅಧಿಕೃತ ವರ್ಗಾವಣೆ ಆದೇಶದ ಕರಡು ತಯಾರಿಸಿ",
    draftingState: "ಜೆಮಿನಿ ಮೂಲಕ ವರ್ಗಾವಣೆ ಆದೇಶ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...",
    approveOrderBtn: "ಅನುಮೋದಿಸಿ ಮತ್ತು ವರ್ಗಾವಣೆ ಮಾಡಿ",
    approvedLogs: "ಪರಿಶೀಲಿಸಿದ ವರ್ಗಾವಣೆ ಲೆಡ್ಜರ್",
    selectPhcPrompt: "ಲೈವ್ ಟೆಲಿಮೆಟ್ರಿ ವೀಕ್ಷಿಸಲು ಜಿಲ್ಲಾ ಕಮಾಂಡ್ ಪ್ಯಾನೆಲ್‌ನಿಂದ ಒಂದು ಕೇಂದ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    fever: "ಜ್ವರ",
    diarrhea: "ಅತಿಸಾರ (ಡಯೇರಿಯಾ)",
    malaria: "ಮಲೇರಿಯಾ",
    rash: "ಚರ್ಮದ ದದ್ದುಗಳು (ರ‍್ಯಾಶ್)",
    uploadPlaceholder: "ಕೈಬರಹದ ರಿಜಿಸ್ಟರ್ ಫೋಟೋವನ್ನು ಇಲ್ಲಿಗೆ ಎಳೆಯಿರಿ ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    uploadSampleBtn: "ಮಳೆಗಾಲದ ಜ್ವರ ಸ್ಯಾಂಪಲ್ ಬಳಸಿ",
    uploadSampleBtn2: "ಡಯೇರಿಯಾ ಸ್ಯಾಂಪಲ್ ಬಳಸಿ",
    digitizingState: "ಜೆಮಿನಿ OCR ಮೂಲಕ ಡೇಟಾವನ್ನು JSON ಫಾರ್ಮ್ಯಾಟ್‌ಗೆ ಪರಿವರ್ತಿಸಲಾಗುತ್ತಿದೆ...",
    digitizedTableTitle: "ಪತ್ತೆಯಾದ ರೋಗಿಗಳ ವಿವರಗಳ ಲೆಡ್ಜರ್",
    commitLedgerBtn: "ದೃಢೀಕರಿಸಿ ಮತ್ತು ಜಿಲ್ಲಾ ಡೇಟಾಬೇಸ್‌ಗೆ ಸೇರಿಸಿ",
    symptomTrend: "14-ದಿನಗಳ ಸಾಂಕ್ರಾಮಿಕ ರೋಗದ ಪ್ರವೃತ್ತಿ ಚಾರ್ಟ್",
    correlationNotice: "ಹವಾಮಾನ ಸಹಸಂಬಂಧ: ಭಾರಿ ಮಳೆ (8-10 ದಿನಗಳ ವಿಳಂಬ) ಸೊಳ್ಳೆಗಳ ಸಂತತಿ ಮತ್ತು ಜ್ವರವನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.",
    environmentalIndicators: "ಪರಿಸರ ಮತ್ತು ಹವಾಮಾನ ಟೆಲಿಮೆಟ್ರಿ",
    avgTemp: "ಸರಾಸರಿ ತಾಪಮಾನ",
    maxRain: "ಗರಿಷ್ಠ ಮಳೆ"
  },
  ta: {
    title: "மாவட்ட சுகாதார கட்டளை போர்டல்",
    subtitle: "யாதாத்ரி புவனகிரி மாவட்டம், பொது சுகாதார நிர்வாகம்",
    simulationNotice: "சிமுலேஷன் பயன்முறை: ஜெமினி ஏபிஐ விசை செயலில் இல்லை. உள்ளூர் மாதிரி பயன்படுத்தப்படுகிறது.",
    activeEngine: "ஜெமினி DMO AI எஞ்சின் செயலில் உள்ளது",
    resetBtn: "தரவு மாதிரியை மீட்டமைக்கவும்",
    districtOverview: "மாவட்ட கட்டளை காட்சி",
    autoFlagging: "தானியங்கி ஆபத்து குறித்தல்",
    searchPlaceholder: "மையங்கள், அறிகுறிகள் அல்லது இருப்பிடத்தைத் தேடுங்கள்...",
    facilityView: "மைய மருத்துவ காட்சி",
    facilityDetail: "மைய செயல்பாடுகள் & தொற்றுநோய் கணிப்பு",
    digitizerTitle: "பதிவேடு புகைப்பட டிஜிட்டல்மயமாக்கல்",
    digitizerDesc: "ஜெமினி மல்டிமாடல் ஓசிஆர் மூலம் கையால் எழுதப்பட்ட பதிவேடுகளை டிஜிட்டல் லெட்ஜராக மாற்றவும்",
    redistributionTitle: "ஸ்மார்ட் வள மறுபகிர்வு",
    redistributionDesc: "மாவட்ட மையங்களுக்கு இடையே எல்ஐ-அடிப்படையிலான மருந்து பற்றாக்குறை மேலாண்மை",
    languageLabel: "மொழி",
    riskScore: "ஆபத்து குறியீடு",
    statusRed: "மிக அவசரம் (CRITICAL)",
    statusAmber: "கண்காணிப்பு (WATCH)",
    statusGreen: "நிலையானது (STABLE)",
    doctorAttendance: "மருத்துவர் வருகை",
    availableBeds: "கிடைக்கும் படுக்கைகள்",
    testKits: "பரிசோதனை கருவிகள்",
    drugInventory: "முக்கிய மருந்து இருப்பு",
    forecastsHeader: "14-நாள் தொற்றுநோய் கணிப்பு",
    explainBtn: "ஜெமினி விளக்கம் பெறவும்",
    explanationTitle: "ஜெமினி மருத்துவ விளக்கம்",
    transferProposal: "மறுபகிர்வு பரிந்துரை",
    transferSource: "கூடுதல் இருப்பு உள்ள மையம்",
    transferTarget: "பற்றாக்குறை உள்ள மையம்",
    transferItem: "மாற்ற வேண்டிய மருந்து",
    transferQty: "மறுபகிர்வு அளவு",
    reasonLabel: "அவசர நிர்வாக காரணம்",
    draftOrderBtn: "அதிகாரப்பூர்வ இடமாற்ற உத்தரவு வரைவை உருவாக்கவும்",
    draftingState: "ஜெமினி மூலம் அரசாங்க உத்தரவு தயாரிக்கப்படுகிறது...",
    approveOrderBtn: "ஒப்புதல் அளித்து இடமாற்றம் செய்யவும்",
    approvedLogs: "சரிபார்க்கப்பட்ட இடமாற்ற லெட்ஜர்",
    selectPhcPrompt: "லைவ் டெலிமெட்ரியை ஆராய மாவட்ட கட்டளை குழுவிலிருந்து ஒரு மையத்தைத் தேர்ந்தெடுக்கவும்.",
    fever: "காய்ச்சல்",
    diarrhea: "வயிற்றுப்போக்கு (டயரியா)",
    malaria: "மலேரியா",
    rash: "தோல் தடிப்புகள் (ரேஷ்)",
    uploadPlaceholder: "கையெழுத்து பதிவேடு புகைப்படத்தை இங்கே இழுக்கவும் அல்லது பதிவேற்றவும்",
    uploadSampleBtn: "மழைக்கால காய்ச்சல் மாதிரியைப் பயன்படுத்தவும்",
    uploadSampleBtn2: "டயரியா மாதிரியைப் பயன்படுத்தவும்",
    digitizingState: "ஜெமினி ஓசிஆர் கையெழுத்துப் பதிவுகளை கட்டமைக்கப்பட்ட JSON ஆக மாற்றுகிறது...",
    digitizedTableTitle: "மீட்கப்பட்ட நோயாளி விபரங்கள் லெட்ஜர்",
    commitLedgerBtn: "உறுதிசெய்து மாவட்ட தரவுத்தளத்தில் சேமிக்கவும்",
    symptomTrend: "14-நாள் தொற்றுநோய் பரவல் வரைபடம்",
    correlationNotice: "வானிலை தொடர்பு: கனமழை (8-10 நாட்கள் தாமதம்) கொசுக்கள் மற்றும் காய்ச்சலை அதிகரிக்கிறது.",
    environmentalIndicators: "சுற்றுச்சூழல் மற்றும் காலநிலை டெலிமெட்ரி",
    avgTemp: "சராசரி வெப்பநிலை",
    maxRain: "அதிகபட்ச மழைப்பொழிவு"
  },
  ml: {
    title: "ജില്ലാ ആരോഗ്യ കമാൻഡ് പോർട്ടൽ",
    subtitle: "യാദാദ്രി ഭുവനഗിരി ജില്ല, പൊതുജനാരോഗ്യ ഭരണവിഭാഗം",
    simulationNotice: "സിമുലേഷൻ മോഡ്: ജെമിനി API കീ നിർജ്ജീവമാണ്. പ്രാദേശിക മോഡൽ ഉപയോഗിക്കുന്നു.",
    activeEngine: "ജെമിനി DMO AI എഞ്ചിൻ സജീവം",
    resetBtn: "ഡാറ്റാ മോഡൽ പുനഃക്രമീകരിക്കുക",
    districtOverview: "ജില്ലാ കമാൻഡ് വ്യൂ",
    autoFlagging: "സ്വയമേവയുള്ള റിസ്ക് ഫ്ലാഗിംഗ്",
    searchPlaceholder: "കേന്ദ്രങ്ങൾ, ലക്ഷണങ്ങൾ അല്ലെങ്കിൽ സ്ഥലം തിരയുക...",
    facilityView: "ക്ലിനിക്കൽ വ്യൂ",
    facilityDetail: "കേന്ദ്രത്തിന്റെ പ്രവർത്തനങ്ങളും പകർച്ചവ്യാധി പ്രവചനവും",
    digitizerTitle: "രജിസ്റ്റർ ഫോട്ടോ ഡിജിറ്റലൈസേഷൻ",
    digitizerDesc: "ജെമിനി മൾട്ടിമോഡൽ OCR ഉപയോഗിച്ച് കൈയെഴുത്ത് രജിസ്റ്ററുകൾ ഡിജിറ്റൽ ലെഡ്ജറാക്കി മാറ്റുക",
    redistributionTitle: "സ്മാർട്ട് വിഭവ പുനർവിതരണം",
    redistributionDesc: "ജില്ലാ കേന്ദ്രങ്ങൾക്കിടയിൽ AI അടിസ്ഥാനമാക്കിയുള്ള മരുന്ന് വിതരണ ആസൂത്രണം",
    languageLabel: "ഭാഷ",
    riskScore: "റിസ്ക് സ്കോർ",
    statusRed: "ഗുരുതരം (CRITICAL)",
    statusAmber: "നിരീക്ഷണം (WATCH)",
    statusGreen: "സ്ഥിരതയുള്ളത് (STABLE)",
    doctorAttendance: "ഡോക്ടർമാരുടെ ഹാജർ",
    availableBeds: "ലഭ്യമായ കിടക്കകൾ",
    testKits: "പരിശോധനാ കിറ്റുകൾ",
    drugInventory: "പ്രധാന മരുന്ന് ശേഖരം",
    forecastsHeader: "14-ദിവസത്തെ പകർച്ചവ്യാധി പ്രവചനം",
    explainBtn: "ജെമിനി വിശദീകരണം നേടുക",
    explanationTitle: "ജെമിനി ക്ലിനിക്കൽ വിശദീകരണം",
    transferProposal: "പുനർവിതരണ ശുപാർശ",
    transferSource: "അധിക ശേഖരമുള്ള കേന്ദ്രം",
    transferTarget: "ക്ഷാമമുള്ള കേന്ദ്രം",
    transferItem: "കൈമാറ്റം ചെയ്യേണ്ട മരുന്ന്",
    transferQty: "പുനർവിതരണ അളവ്",
    reasonLabel: "അടിയന്തിര ഭരണപരമായ കാരണം",
    draftOrderBtn: "ഔദ്യോഗിക കൈമാറ്റ ഉത്തരവ് തയ്യാറാക്കുക",
    draftingState: "ജെമിനി വഴി സർക്കാർ ഉത്തരവ് രൂപകൽപ്പന ചെയ്യുന്നു...",
    approveOrderBtn: "അംഗീകരിച്ച് കൈമാറ്റം പൂർത്തിയാക്കുക",
    approvedLogs: "സ്ഥിരീകരിച്ച കൈമാറ്റ ലെഡ്ജർ",
    selectPhcPrompt: "തത്സമയ വിവരങ്ങൾ പരിശോധിക്കാൻ ജില്ലാ കമാൻഡ് പാനലിൽ നിന്ന് ഒരു കേന്ദ്രം തിരഞ്ഞെടുക്കുക.",
    fever: "പനി",
    diarrhea: "അതിസാരം (ഡയറിയ)",
    malaria: "മലേറിയ",
    rash: "ത്വഗ്‌രോഗങ്ങൾ (റാഷ്)",
    uploadPlaceholder: "കൈയെഴുത്ത് രജിസ്റ്റർ ചിത്രം ഇവിടെ വലിച്ചിടുക അല്ലെങ്കിൽ അപ്‌ലോഡ് ചെയ്യുക",
    uploadSampleBtn: "വർഷകാല പനി മാതൃക ഉപയോഗിക്കുക",
    uploadSampleBtn2: "ഡയറിയ മാതൃക ഉപയോഗിക്കുക",
    digitizingState: "ജെമിനി ഒസിആർ കൈയെഴുത്തുരേഖകൾ ഘടനാപരമായ JSON ലേക്ക് മാറ്റുന്നു...",
    digitizedTableTitle: "കണ്ടെത്തിയ രോഗികളുടെ വിവരങ്ങൾ",
    commitLedgerBtn: "സ്ഥിരീകരിച്ച് ജില്ലാ ഡാറ്റാബേസിൽ ചേർക്കുക",
    symptomTrend: "14-ദിവസത്തെ പകർച്ചവ്യാധി വ്യാപന ചാർട്ട്",
    correlationNotice: "കാലാവസ്ഥാ ബന്ധം: ശക്തമായ മഴ (8-10 ദിവസത്തെ കാലതാമസം) കൊതുക് വളർച്ചയും പനിയും കൂട്ടുന്നു.",
    environmentalIndicators: "പരിസ്ഥിതി കാലാവസ്ഥാ ടെലിമെട്രി",
    avgTemp: "ശരാശരി താപനില",
    maxRain: "പരമാവധി മഴ"
  },
  gu: {
    title: "જીલ્લા આરોગ્ય કમાન્ડ પોર્ટલ",
    subtitle: "યાદાદ્રી ભુવનગિરી જીલ્લો, જાહેર આરોગ્ય વહીવટીતંત્ર",
    simulationNotice: "સિમ્યુલેશન મોડ: જેમિની API કી નિષ્ક્રિય છે. સ્થાનિક મોડલ વપરાય છે.",
    activeEngine: "જેમિની DMO AI એન્જિન સક્રિય",
    resetBtn: "ડેટા મોડલ રીસેટ કરો",
    districtOverview: "જીલ્લા કમાન્ડ વ્યુ",
    autoFlagging: "સ્વયંસંચાલિત જોખમ ફ્લેગિંગ",
    searchPlaceholder: "કેન્દ્રો, લક્ષણો અથવા સ્થાન શોધો...",
    facilityView: "ક્લિનિકલ વ્યુ",
    facilityDetail: "કેન્દ્ર કામગીરી અને રોગચાળો પૂર્વઅનુમાન",
    digitizerTitle: "રજીસ્ટર ફોટો ડિજિટાઈઝેશન",
    digitizerDesc: "જેમિની મલ્ટીમોડલ OCR દ્વારા હસ્તલિખિત તબીબી લખાણોને ડિજિટલ લેજરમાં રૂપાંતરિત કરો",
    redistributionTitle: "સ્માર્ટ સંસાધન પુનઃવિતરણ",
    redistributionDesc: "જીલ્લા કેન્દ્રો વચ્ચે AI-આધારિત દવાની અછત નિવારણ",
    languageLabel: "ભાષા",
    riskScore: "જોખમ સ્કોર",
    statusRed: "ગંભીર (CRITICAL)",
    statusAmber: "નિરીક્ષણ (WATCH)",
    statusGreen: "સ્થિર (STABLE)",
    doctorAttendance: "તબીબ હાજરી",
    availableBeds: "ઉપલબ્ધ બેડ",
    testKits: "ટેસ્ટ કીટ્સ",
    drugInventory: "મુખ્ય દવા સ્ટોક",
    forecastsHeader: "14-દિવસીય રોગચાળો પૂર્વઅનુમાન",
    explainBtn: "જેમિની સમજૂતી મેળવો",
    explanationTitle: "જેમિની તબીબી સમજૂતી",
    transferProposal: "પુનઃવિતરણ ભલામણ",
    transferSource: "વધારાનો સ્ટોક ધરાવતું કેન્દ્ર",
    transferTarget: "અછત ધરાવતું કેન્દ્ર",
    transferItem: "બદલી કરવાની દવા",
    transferQty: "પુનઃવિતરણ જથ્થો",
    reasonLabel: "તાકીદનું વહીવટી કારણ",
    draftOrderBtn: "શાશકીય સ્થાનાંતરણ ઓર્ડરનો મુસદ્દો તૈયાર કરો",
    draftingState: "જેમિની દ્વારા સરકારી ઓર્ડર તૈયાર કરવામાં આવી રહ્યો છે...",
    approveOrderBtn: "મંજૂર કરો અને સ્થાનાંતરણ કરો",
    approvedLogs: "ચકાસાયેલ સ્થાનાંતરણ લેજર",
    selectPhcPrompt: "લાઇવ ટેલિમેટ્રી તપાસવા માટે જીલ્લા કમાન્ડ પેનલમાંથી કોઈ એક કેન્દ્ર પસંદ કરો.",
    fever: "તાવ",
    diarrhea: "ઝાડા (ડાયરિયા)",
    malaria: "મેલેરિયા",
    rash: "ચામડીના ચકામા (રેશ)",
    uploadPlaceholder: "હસ્તલિખિત રજીસ્ટર ફોટો અહીં ખેંચો અથવા અપલોડ કરો",
    uploadSampleBtn: "ચોમાસા તાવના નમૂનાનો ઉપયોગ કરો",
    uploadSampleBtn2: "ડાયરિયાના નમૂનાનો ઉપયોગ કરો",
    digitizingState: "જેમિની ઓસીઆર માહિતીને માળખાગત JSON માં ફેરવે છે...",
    digitizedTableTitle: "શોધાયેલ દર્દીઓની વિગત લેજર",
    commitLedgerBtn: "ચકાસો અને જીલ્લા ડેટાબેઝમાં સાચવો",
    symptomTrend: "14-દિવસીય રોગચાળો ફેલાવવાનો આલેખ",
    correlationNotice: "હવામાન સંબંધ: ભારે વરસાદ (8-10 દિવસનો વિલંબ) મચ્છરોનો ઉપદ્રવ અને તાવ વધારે છે.",
    environmentalIndicators: "પર્યાવરણીય અને હવામાન ટેલિમેટ્રી",
    avgTemp: "સરેરાશ તાપમાન",
    maxRain: "મહત્તમ વરસાદ"
  },
  pa: {
    title: "ਜ਼ਿਲ੍ਹਾ ਸਿਹਤ ਕਮਾਂਡ ਪੋਰਟਲ",
    subtitle: "ਯਾਦਾਦਰੀ ਭੁਵਨਗਿਰੀ ਜ਼ਿਲ੍ਹਾ, ਜਨਤਕ ਸਿਹਤ ਪ੍ਰਸ਼ਾਸਨ",
    simulationNotice: "ਸਿਮੂਲੇਸ਼ਨ ਮੋਡ: ਜੈਮਿਨੀ API ਕੁੰਜੀ ਅਕਿਰਿਆਸ਼ੀਲ ਹੈ। ਸਥਾਨਕ ਮਾਡਲ ਵਰਤਿਆ ਜਾ ਰਿਹਾ ਹੈ।",
    activeEngine: "ਜੈਮਿਨੀ DMO AI ਇੰਜਨ ਸਰਗਰਮ",
    resetBtn: "ਡੇਟਾ ਮਾਡਲ ਰੀਸੈਟ ਕਰੋ",
    districtOverview: "ਜ਼ਿਲ੍ਹਾ ਕਮਾਂਡ ਵਿਊ",
    autoFlagging: "ਸਵੈਚਾਲਿਤ ਜੋਖਮ ਚਿੰਨ੍ਹਤ",
    searchPlaceholder: "ਕੇਂਦਰ, ਲੱਛਣ ਜਾਂ ਸਥਾਨ ਖੋਜੋ...",
    facilityView: "ਕਲੀਨਿਕਲ ਵਿਊ",
    facilityDetail: "ਕੇਂਦਰ ਸੰਚਾਲਨ ਅਤੇ ਮਹਾਂਮਾਰੀ ਪੂਰਵ-ਅਨੁਮਾਨ",
    digitizerTitle: "ਰਜਿਸਟਰ ਫੋਟੋ ਡਿਜੀਟਾਈਜ਼ੇਸ਼ਨ",
    digitizerDesc: "ਜੈਮਿਨੀ ਮਲਟੀਮੋਡਲ OCR ਰਾਹੀਂ ਹੱਥ ਲਿਖਤ ਰਜਿਸਟਰਾਂ ਨੂੰ ਡਿਜੀਟਲ ਲੈਜ਼ਰ ਵਿੱਚ ਬਦਲੋ",
    redistributionTitle: "ਸਮਾਰਟ ਸਰੋਤ ਮੁੜ-ਵੰਡ",
    redistributionDesc: "ਜ਼ਿਲ੍ਹਾ ਕੇਂਦਰਾਂ ਵਿਚਕਾਰ AI-ਅਧਾਰਤ ਦਵਾਈਆਂ ਦੀ ਘਾਟ ਦਾ ਹੱਲ",
    languageLabel: "ਭਾਸ਼ਾ",
    riskScore: "ਜੋਖਮ ਸਕੋਰ",
    statusRed: "ਗੰਭੀਰ (CRITICAL)",
    statusAmber: "ਨਿਗਰਾਨੀ (WATCH)",
    statusGreen: "ਸਥਿਰ (STABLE)",
    doctorAttendance: "ਡਾਕਟਰਾਂ ਦੀ ਹਾਜ਼ਰੀ",
    availableBeds: "ਉਪਲਬਧ ਬਿਸਤਰੇ",
    testKits: "ਟੈਸਟ ਕਿੱਟਾਂ",
    drugInventory: "ਮੁੱਖ ਦਵਾਈ ਸਟਾਕ",
    forecastsHeader: "14-ਦਿਨਾਂ ਮਹਾਂਮਾਰੀ ਪੂਰਵ-ਅਨੁਮਾਨ",
    explainBtn: "ਜੈਮਿਨੀ ਵਿਸ਼ਲੇਸ਼ਣ ਪ੍ਰਾਪਤ ਕਰੋ",
    explanationTitle: "ਜੈਮਿਨੀ ਮੈਡੀਕਲ ਵਿਸ਼ਲੇਸ਼ਣ",
    transferProposal: "ਮੁੜ-ਵੰਡ ਦੀ ਸਿਫਾਰਸ਼",
    transferSource: "ਵਾਧੂ ਸਟਾਕ ਵਾਲਾ ਕੇਂਦਰ",
    transferTarget: "ਘਾਟ ਵਾਲਾ ਕੇਂਦਰ",
    transferItem: "ਟ੍ਰਾਂਸਫਰ ਦਵਾਈ",
    transferQty: "ਮੁੜ-ਵੰਡ ਮਾਤਰਾ",
    reasonLabel: "ਹੰਗਾਮੀ ਪ੍ਰਸ਼ਾਸਕੀ ਕਾਰਨ",
    draftOrderBtn: "ਅਧਿਕਾਰਤ ਟ੍ਰਾਂਸਫਰ ਆਰਡਰ ਦਾ ਖਰੜਾ ਤਿਆਰ ਕਰੋ",
    draftingState: "ਜੈਮਿਨੀ ਦੁਆਰਾ ਸਰਕਾਰੀ ਹੁਕਮਨਾਮਾ ਤਿਆਰ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...",
    approveOrderBtn: "ਮਨਜ਼ੂਰ ਕਰੋ ਅਤੇ ਟ੍ਰਾਂਸਫਰ ਕਰੋ",
    approvedLogs: "ਪ੍ਰਮਾਣਿਤ ਟ੍ਰਾਂਸਫਰ ਲੈਜ਼ਰ",
    selectPhcPrompt: "ਲਾਈਵ ਟੈਲੀਮੈਟਰੀ ਦੇਖਣ ਲਈ ਜ਼ਿਲ੍ਹਾ ਕਮਾਂਡ ਪੈਨਲ ਤੋਂ ਇੱਕ ਕੇਂਦਰ ਚੁਣੋ।",
    fever: "ਬੁਖ਼ਾਰ",
    diarrhea: "ਦਸਤ (ਡਾਇਰੀਆ)",
    malaria: "ਮਲੇਰੀਆ",
    rash: "ਚਮੜੀ ਦੇ ਦਾਣੇ (ਰੈਸ਼)",
    uploadPlaceholder: "ਹੱਥ ਲਿਖਤ ਰਜਿਸਟਰ ਦੀ ਫੋਟੋ ਇੱਥੇ ਖਿੱਚੋ ਜਾਂ ਅਪਲੋਡ ਕਰੋ",
    uploadSampleBtn: "ਮਾਨਸੂਨ ਬੁਖ਼ਾਰ ਸੈਂਪਲ ਵਰਤੋ",
    uploadSampleBtn2: "ਡਾਇਰੀਆ ਸੈਂਪਲ ਵਰਤੋ",
    digitizingState: "ਜੈਮਿਨੀ ਓਸੀਆਰ ਡੇਟਾ ਨੂੰ ਢਾਂਚਾਗਤ JSON ਵਿੱਚ ਬਦਲ ਰਿਹਾ ਹੈ...",
    digitizedTableTitle: "ਲੱਭੇ ਗਏ ਮਰੀਜ਼ਾਂ ਦੇ ਵੇਰਵਿਆਂ ਦਾ ਲੈਜ਼ਰ",
    commitLedgerBtn: "ਪੁਸ਼ਟੀ ਕਰੋ ਅਤੇ ਜ਼ਿਲ੍ਹਾ ਡੇਟਾਬੇਸ ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਕਰੋ",
    symptomTrend: "14-ਦਿਨਾਂ ਬਿਮਾਰੀ ਫੈਲਣ ਦਾ ਚਾਰਟ",
    correlationNotice: "ਮੌਸਮ ਸੰਬੰਧ: ਭਾਰੀ ਬਾਰਸ਼ (8-10 ਦਿਨਾਂ ਦੀ ਦੇਰੀ) ਮੱਛਰਾਂ ਦੀ ਪੈਦਾਵਾਰ ਅਤੇ ਬੁਖ਼ਾਰ ਨੂੰ ਵਧਾਉਂਦੀ ਹੈ।",
    environmentalIndicators: "ਵਾਤਾਵਰਣ ਅਤੇ ਜਲਵਾਯೂ ਟੈਲੀਮੈਟਰੀ",
    avgTemp: "ਔਸਤ ਤਾਪਮਾਨ",
    maxRain: "ਵੱਧ ਤੋਂ ਵੱध ਮੀਂਹ"
  },
  or: {
    title: "ଜିଲ୍ଲା ସ୍ୱାସ୍ଥ୍ୟ କମାଣ୍ଡ ପୋର୍ଟାଲ",
    subtitle: "ଯାଦାଦ୍ରି ଭୁବନଗିରି ଜିଲ୍ଲା, ଜନ ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରଶାସନ",
    simulationNotice: "ସିମୁଲେସନ୍ ମୋଡ୍: ଜେମିନି API କି ନିଷ୍କ୍ରିୟ ଅଛି | ସ୍ଥାନୀୟ ମଡେଲ୍ ବ୍ୟବହୃତ ହେଉଛି |",
    activeEngine: "ଜେମିନି DMO AI ଇଞ୍ଜିନ ସକ୍ରିୟ",
    resetBtn: "ଡେଟା ମଡେଲ୍ ପୁନର୍ବାର ସେଟ୍ କରନ୍ତୁ",
    districtOverview: "ଜିଲ୍ଲା କମାଣ୍ଡ ଭ୍ୟୁ",
    autoFlagging: "ସ୍ୱୟଂଚାଳିତ ବିପଦ ଚିହ୍ନଟ",
    searchPlaceholder: "କେନ୍ଦ୍ର, ଲକ୍ଷଣ କିମ୍ବା ସ୍ଥାନ ଖୋଜନ୍ତୁ...",
    facilityView: "କ୍ଲିନିକାଲ୍ ଭ୍ୟୁ",
    facilityDetail: "କେନ୍ଦ୍ରର କାର୍ଯ୍ୟକଳାପ ଓ ମହାମାରୀ ପୂର୍ବାନୁମାନ",
    digitizerTitle: "ରେଜିଷ୍ଟର ଫଟୋ ଡିଜିଟାଇଜେସନ୍",
    digitizerDesc: "ଜେମିନି ମଲ୍ଟିମୋଡାଲ୍ OCR ବ୍ୟବହାର କରି ହାତଲେଖା ମେଡିକାଲ୍ ରେଜିଷ୍ଟରକୁ ଡିଜିଟାଲ୍ ଲେଜରରେ ପରିଣତ କରନ୍ତୁ",
    redistributionTitle: "ସ୍ମାର୍ଟ ସମ୍ବଳ ପୁନର୍ବଣ୍ଟନ",
    redistributionDesc: "ଜିଲ୍ଲା କେନ୍ଦ୍ରଗୁଡ଼ିକ ମଧ୍ୟରେ AI-ଆଧାରିତ ଔଷଧ ଅଭାବର ନିରାକରଣ",
    languageLabel: "ଭାଷା",
    riskScore: "ବିପଦ ସୂଚକାଙ୍କ",
    statusRed: "ଜରୁରୀକାଳୀନ (CRITICAL)",
    statusAmber: "ନଜରରେ (WATCH)",
    statusGreen: "ସ୍ଥିର (STABLE)",
    doctorAttendance: "ଡାକ୍ତର ଉପସ୍ଥିତି",
    availableBeds: "ଉପଲବ୍ଧ ଶଯ୍ୟା",
    testKits: "ପରୀକ୍ଷଣ କିଟ୍",
    drugInventory: "ମୁଖ୍ୟ ଔଷଧ ମହଜୁଦ",
    forecastsHeader: "14-ଦିନର ମହାମାରୀ ପୂର୍ବାନୁମାନ",
    explainBtn: "ଜେମିନି ବିଶ୍ଳେଷଣ ପାଆନ୍ତು",
    explanationTitle: "ଜେମିନି ମେଡିକାଲ୍ ସ୍ପଷ୍ଟୀକରଣ",
    transferProposal: "ପୁନର୍ବଣ୍ଟନ ସୁପାରିଶ",
    transferSource: "ଅଧିକ ମହଜୁଦ ଥିବା କେନ୍ଦ୍ର",
    transferTarget: "ଅଭାବ ଥିବା କେନ୍ଦ୍ର",
    transferItem: "ସ୍ଥାନାନ୍ତରିତ ଔଷଧ",
    transferQty: "ପୁନର୍ବଣ୍ଟନ ପରିମାଣ",
    reasonLabel: "ଜରୁରୀ ପ୍ରଶାସନିକ କାରଣ",
    draftOrderBtn: "ସରକାରୀ ସ୍ଥାନାନ୍ତର ନିର୍ଦ୍ଦେଶାମା ପ୍ରସ୍ତୁତ କରନ୍ତು",
    draftingState: "ଜେମିନି ମାଧ୍ୟମରେ ସରକାରୀ ନିର୍ଦ୍ଦେଶାମା ପ୍ରସ୍ତୁତ ଚାଲିଛି...",
    approveOrderBtn: "ଅନୁମୋଦନ କରନ୍ତು ଏବଂ ସ୍ଥାନାନ୍ତର କରନ୍ତು",
    approvedLogs: "ଯାଞ୍ଚ ହୋଇଥିବା ସ୍ଥାନାନ୍ତର ଲେଜର",
    selectPhcPrompt: "ଲାଇଭ୍ ଟେଲିମେଟ୍ରି ଦେଖିବା ପାଇଁ ଜିଲ୍ଲା କମାଣ୍ଡ୍ ପ୍ୟାନେଲ୍‌ରୁ ଏକ କେନ୍ଦ୍ର ବାଛନ୍ତು ।",
    fever: "ଜ୍ୱର",
    diarrhea: "ଝାଡ଼ାବାନ୍ତି (ଡାଇରିଆ)",
    malaria: "ମ୍ୟାଲେରିଆ",
    rash: "ଚର୍ମ ରୋଗ (ରାଶ୍‌)",
    uploadPlaceholder: "ହାତଲେଖା ରେଜିଷ୍ଟର ଫଟୋକୁ ଏଠାରେ ଡ୍ରପ୍ କରନ୍ତು କିମ୍ବା ଅପଲୋଡ୍ କରନ୍ତು",
    uploadSampleBtn: "ବର୍ଷାଦିନିଆ ଜ୍ୱର ନମୁନା ବ୍ୟବହାର କରନ୍ତು",
    uploadSampleBtn2: "ଡାଇରିଆ ନମୁନା ବ୍ୟବହାର କରନ୍ତು",
    digitizingState: "ଜେମିନି OCR ତଥ୍ୟକୁ ସଂରଚିତ JSON ରେ ପରିଣତ କରୁଛି...",
    digitizedTableTitle: "ଖୋଜାଯାଇଥିବା ରୋଗୀ ବିବରଣୀ ଲେଜର",
    commitLedgerBtn: "ନିଶ୍ଚିତ କରନ୍ତು ଏବଂ ଜିଲ୍ଲା ଡେଟାବେସରେ ସଂରକ୍ଷଣ କରନ୍ତು",
    symptomTrend: "14-ଦିନର ମହାମାରୀ ବ୍ୟାପିବା ଗ୍ରାଫ୍",
    correlationNotice: "ପାଣିପାଗ ସମ୍ବନ୍ଧ: ପ୍ରବଳ ବର୍ଷା (8-10 ଦିନର ବିଳମ୍ବ) ମଶା ବଂଶବୃଦ୍ଧି ଏବଂ ଜ୍ୱର ବୃଦ୍ଧି କରିଥାଏ ।",
    environmentalIndicators: "ପରିବେଶ ଏବଂ ଜଳବାୟୁ ଟେଲିମେଟ୍ରି",
    avgTemp: "ହାରାହାରି ତାପମାତ୍ରା",
    maxRain: "ସର୍ବାଧିକ ବୃଷ୍ଟିପାତ"
  }
};

const PHC_COORDINATES: Record<string, { x: number; y: number }> = {
  malihabad: { x: 48, y: 46 },
  mohanlalganj: { x: 54, y: 56 },
  chinhat: { x: 57, y: 47 },
  cholapur: { x: 78, y: 72 },
  pindra: { x: 73, y: 69 },
  kashi_vidya: { x: 77, y: 75 },
  campierganj: { x: 81, y: 33 },
  pipraich: { x: 88, y: 38 },
  bhathat: { x: 85, y: 31 },
  fatehabad: { x: 19, y: 48 },
  achhnera: { x: 11, y: 41 },
  pinahat: { x: 21, y: 54 },
  kalyanpur: { x: 37, y: 58 },
  bidhnu: { x: 39, y: 65 },
  sarsaul: { x: 44, y: 67 },

  // Bihar
  phulwari_sharif: { x: 30, y: 60 },
  musahri: { x: 65, y: 35 },

  // Gujarat
  sanand: { x: 35, y: 45 },
  viramgam: { x: 60, y: 40 },

  // Haryana
  sohna: { x: 35, y: 55 },
  farrukhnagar: { x: 65, y: 40 },

  // Assam
  hajo: { x: 28, y: 45 },
  titabar: { x: 68, y: 48 },

  // Nagaland
  chiephobozou: { x: 35, y: 45 },
  tseminyu: { x: 60, y: 42 },

  // Telangana
  choutuppal: { x: 32, y: 50 },
  ramannapet: { x: 68, y: 45 },

  // Tamil Nadu
  sriperumbudur: { x: 32, y: 48 },
  kundrathur: { x: 65, y: 46 }
};

const PHC_GEOGRAPHY: Record<string, { lat: number; lon: number; district: string; state: string }> = {
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

  // Tamil Nadu
  sriperumbudur: { lat: 12.9700, lon: 79.9500, district: "Kanchipuram", state: "Tamil Nadu" },
  kundrathur: { lat: 13.0000, lon: 80.0600, district: "Kanchipuram", state: "Tamil Nadu" }
};

const getIndiaXY = (lat: number, lon: number) => {
  // India bounds: West ~68.0° E, East ~97.5° E
  // North ~36.0° N, South ~6.0° N
  const minLon = 68.0;
  const maxLon = 97.5;
  const minLat = 6.0;
  const maxLat = 36.0;

  // Map to SVG viewBox of 0 0 100 120
  const x = ((lon - minLon) / (maxLon - minLon)) * 100;
  const y = 120 - ((lat - minLat) / (maxLat - minLat)) * 120;
  return { x, y };
};

const convertFeatureToSvgPath = (feature: any): string => {
  const { geometry } = feature;
  if (!geometry) return "";
  
  const processPolygon = (polygonCoords: any[][]): string => {
    return polygonCoords.map(ring => {
      if (!ring || ring.length === 0) return "";
      const points = ring.map((pt) => {
        if (!pt || pt.length < 2) return "";
        const lon = pt[0];
        const lat = pt[1];
        const { x, y } = getIndiaXY(lat, lon);
        return `${x.toFixed(3)},${y.toFixed(3)}`;
      }).filter(Boolean);
      if (points.length === 0) return "";
      return `M ${points.join(" L ")} Z`;
    }).filter(Boolean).join(" ");
  };

  if (geometry.type === "Polygon") {
    return processPolygon(geometry.coordinates);
  } else if (geometry.type === "MultiPolygon") {
    if (!Array.isArray(geometry.coordinates)) return "";
    return geometry.coordinates.map((poly: any) => {
      if (!Array.isArray(poly)) return "";
      return processPolygon(poly);
    }).filter(Boolean).join(" ");
  }
  return "";
};

const STATE_CENTERS: Record<string, { lat: number; lon: number }> = {
  "Andhra Pradesh": { lat: 15.9129, lon: 79.7400 },
  "Arunachal Pradesh": { lat: 28.2180, lon: 94.7278 },
  "Assam": { lat: 26.2006, lon: 92.9376 },
  "Bihar": { lat: 25.0961, lon: 85.3131 },
  "Chhattisgarh": { lat: 21.2787, lon: 81.8661 },
  "Goa": { lat: 15.2993, lon: 74.1240 },
  "Gujarat": { lat: 22.2587, lon: 71.1924 },
  "Haryana": { lat: 29.0588, lon: 76.0856 },
  "Himachal Pradesh": { lat: 31.1048, lon: 77.1734 },
  "Jharkhand": { lat: 23.6102, lon: 85.2799 },
  "Karnataka": { lat: 15.3173, lon: 75.7139 },
  "Kerala": { lat: 10.8505, lon: 76.2711 },
  "Madhya Pradesh": { lat: 22.9734, lon: 78.6569 },
  "Maharashtra": { lat: 19.7515, lon: 75.7139 },
  "Manipur": { lat: 24.6637, lon: 93.9063 },
  "Meghalaya": { lat: 25.4670, lon: 91.3662 },
  "Mizoram": { lat: 23.1645, lon: 92.9376 },
  "Nagaland": { lat: 26.1584, lon: 94.5624 },
  "Odisha": { lat: 20.9517, lon: 85.0985 },
  "Punjab": { lat: 31.1471, lon: 75.3412 },
  "Rajasthan": { lat: 27.0238, lon: 74.2179 },
  "Sikkim": { lat: 27.5330, lon: 88.5122 },
  "Tamil Nadu": { lat: 11.1271, lon: 78.6569 },
  "Telangana": { lat: 17.2500, lon: 78.9000 },
  "Tripura": { lat: 23.9408, lon: 91.9882 },
  "Uttar Pradesh": { lat: 26.8467, lon: 80.9462 },
  "Uttarakhand": { lat: 30.0668, lon: 79.0193 },
  "West Bengal": { lat: 22.9868, lon: 87.8550 },
  "Andaman and Nicobar Islands": { lat: 11.7401, lon: 92.6586 },
  "Chandigarh": { lat: 30.7333, lon: 76.7794 },
  "Dadra and Nagar Haveli and Daman and Diu": { lat: 20.1800, lon: 73.0100 },
  "Delhi": { lat: 28.7041, lon: 77.1025 },
  "Jammu and Kashmir": { lat: 33.7782, lon: 76.5762 },
  "Ladakh": { lat: 34.1526, lon: 77.5771 },
  "Lakshadweep": { lat: 10.5667, lon: 72.6417 },
  "Puducherry": { lat: 11.9416, lon: 79.8083 }
};

const getLocalCoords = (phc: any) => {
  if (PHC_COORDINATES[phc.id]) {
    return PHC_COORDINATES[phc.id];
  }
  const stateCenter = STATE_CENTERS[phc.state || ""] || { lat: 20, lon: 80 };
  const dLat = (phc.latitude || 20) - stateCenter.lat;
  const dLon = (phc.longitude || 80) - stateCenter.lon;
  
  // Project locally around (50, 50) using scale factors to keep pins perfectly contained
  const x = Math.max(15, Math.min(85, 50 + dLon * 160));
  const y = Math.max(15, Math.min(85, 50 - dLat * 160));
  return { x, y };
};

const MAP_CONNECTIONS: string[][] = [
  ["achhnera", "fatehabad"],
  ["fatehabad", "pinahat"],
  ["malihabad", "chinhat"],
  ["chinhat", "mohanlalganj"],
  ["campierganj", "bhathat"],
  ["bhathat", "pipraich"],
  ["pindra", "kashi_vidya"],
  ["kashi_vidya", "cholapur"],
  ["kalyanpur", "bidhnu"],
  ["bidhnu", "sarsaul"],
  ["mohanlalganj", "kalyanpur"],
  ["chinhat", "bhathat"],
  ["mohanlalganj", "pindra"],

  // Bihar connections
  ["phulwari_sharif", "musahri"],

  // Gujarat connections
  ["sanand", "viramgam"],

  // Haryana connections
  ["sohna", "farrukhnagar"],

  // Assam connections
  ["hajo", "titabar"],

  // Nagaland connections
  ["chiephobozou", "tseminyu"],

  // Telangana connections
  ["choutuppal", "ramannapet"],

  // Tamil Nadu connections
  ["sriperumbudur", "kundrathur"]
];

const STATE_HIGHLIGHTS = [
  { name: "UTTAR PRADESH", path: "M 43,30 L 53,28 L 64,32 L 62,42 L 48,44 L 43,38 Z", labelX: 52, labelY: 32 },
  { name: "BIHAR", path: "M 58,38 L 68,38 L 66,45 L 56,45 Z", labelX: 62, labelY: 41 },
  { name: "GUJARAT", path: "M 10,48 L 22,48 L 20,56 L 8,56 Z", labelX: 15, labelY: 52 },
  { name: "HARYANA", path: "M 28,26 L 34,26 L 32,32 L 26,32 Z", labelX: 30, labelY: 29 },
  { name: "ASSAM", path: "M 78,38 L 88,38 L 86,43 L 76,43 Z", labelX: 82, labelY: 40 },
  { name: "NAGALAND", path: "M 88,36 L 94,36 L 92,42 L 86,42 Z", labelX: 90, labelY: 38 },
  { name: "TELANGANA", path: "M 32,70 L 42,70 L 40,78 L 30,78 Z", labelX: 36, labelY: 74 },
  { name: "TAMIL NADU", path: "M 30,95 L 40,95 L 38,105 L 28,105 Z", labelX: 34, labelY: 100 },
  { name: "KERALA", path: "M 27,98 L 30,98 L 29,106 L 26,106 Z", labelX: 28, labelY: 102 },
  { name: "ANDHRA PRADESH", path: "M 38,75 L 50,75 L 48,85 L 36,85 Z", labelX: 43, labelY: 80 },
  { name: "WEST BENGAL", path: "M 64,55 L 72,55 L 70,65 L 62,65 Z", labelX: 67, labelY: 60 },
  { name: "PUNJAB", path: "M 22,20 L 28,20 L 26,26 L 20,26 Z", labelX: 24, labelY: 23 },
  { name: "RAJASTHAN", path: "M 18,32 L 32,25 L 38,30 L 41,38 L 28,42 Z", labelX: 29, labelY: 34 },
  { name: "MADHYA PRADESH", path: "M 28,42 L 41,38 L 48,44 L 58,45 L 54,58 L 32,58 Z", labelX: 42, labelY: 48 },
  { name: "MAHARASHTRA", path: "M 22,56 L 32,58 L 44,58 L 44,70 L 26,68 L 20,62 Z", labelX: 32, labelY: 64 },
  { name: "JAMMU & KASHMIR", path: "M 43,18 L 42,15 L 41,10 L 45,5 L 48,3 L 52,5 L 54,12 L 51,16 Z", labelX: 47, labelY: 8 },
  { name: "KARNATAKA", path: "M 26,68 L 32,70 L 30,78 L 32,82 L 35,90 L 29,85 Z", labelX: 29, labelY: 78 },
  { name: "ODISHA", path: "M 54,58 L 68,60 L 64,64 L 54,74 Z", labelX: 61, labelY: 65 }
];

const STATE_OUTLINES: Record<string, string> = {
  "Uttar Pradesh": "M 15,15 L 45,10 L 85,15 L 90,45 L 85,75 L 55,85 L 35,80 L 15,60 Z",
  "Bihar": "M 15,25 L 45,20 L 85,25 L 85,65 L 50,75 L 15,65 Z",
  "Gujarat": "M 10,25 L 40,20 L 80,25 L 90,60 L 60,85 L 20,80 Z",
  "Haryana": "M 20,15 L 60,10 L 80,30 L 75,75 L 35,80 L 15,50 Z",
  "Assam": "M 15,35 L 50,25 L 85,35 L 90,60 L 60,75 L 20,65 Z",
  "Nagaland": "M 25,20 L 75,15 L 85,55 L 45,85 L 15,55 Z",
  "Telangana": "M 20,20 L 70,15 L 85,55 L 55,85 L 15,55 Z",
  "Tamil Nadu": "M 30,15 L 75,20 L 70,75 L 50,90 L 25,75 Z"
};

const STATE_REGIONS: Record<string, { name: string; points: string; textX: number; textY: number; colorClass: string; textColorClass: string }[]> = {
  "Uttar Pradesh": [
    { name: "AGRA DIVISION", points: "5,30 28,30 28,65 5,65", textX: 16.5, textY: 33, colorClass: "fill-amber-500/[0.015] stroke-amber-500/20", textColorClass: "fill-amber-400/85" },
    { name: "KANPUR NAGAR", points: "30,55 46,55 46,75 30,75", textX: 38, textY: 54, colorClass: "fill-emerald-500/[0.015] stroke-emerald-500/20", textColorClass: "fill-emerald-400/85" },
    { name: "LUCKNOW DIVISION", points: "46,38 65,38 65,65 46,65", textX: 55, textY: 37, colorClass: "fill-indigo-500/[0.015] stroke-indigo-500/20", textColorClass: "fill-indigo-400/85" },
    { name: "VARANASI DIVISION", points: "67,62 82,62 82,85 67,85", textX: 74.5, textY: 61, colorClass: "fill-cyan-500/[0.015] stroke-cyan-500/20", textColorClass: "fill-cyan-400/85" },
    { name: "GORAKHPUR DIVISION", points: "76,20 95,20 95,45 76,45", textX: 85.5, textY: 19, colorClass: "fill-rose-500/[0.015] stroke-rose-500/20", textColorClass: "fill-rose-400/85" }
  ],
  "Bihar": [
    { name: "PATNA DIVISION", points: "15,40 50,40 45,85 10,80", textX: 27.5, textY: 45, colorClass: "fill-amber-500/[0.015] stroke-amber-500/20", textColorClass: "fill-amber-400/85" },
    { name: "TIRHUT DIVISION", points: "50,15 90,20 85,60 45,55", textX: 70, textY: 24, colorClass: "fill-cyan-500/[0.015] stroke-cyan-500/20", textColorClass: "fill-cyan-400/85" }
  ],
  "Gujarat": [
    { name: "SANAND REGION", points: "15,20 50,15 45,80 15,75", textX: 30, textY: 28, colorClass: "fill-emerald-500/[0.015] stroke-emerald-500/20", textColorClass: "fill-emerald-400/85" },
    { name: "VIRAMGAM REGION", points: "50,15 85,20 80,75 45,80", textX: 68, textY: 28, colorClass: "fill-amber-500/[0.015] stroke-amber-500/20", textColorClass: "fill-amber-400/85" }
  ],
  "Haryana": [
    { name: "SOHNA REGION", points: "15,20 50,15 45,80 15,75", textX: 30, textY: 28, colorClass: "fill-indigo-500/[0.015] stroke-indigo-500/20", textColorClass: "fill-indigo-400/85" },
    { name: "FARRUKHNAGAR REGION", points: "50,15 85,20 80,75 45,80", textX: 68, textY: 28, colorClass: "fill-cyan-500/[0.015] stroke-cyan-500/20", textColorClass: "fill-cyan-400/85" }
  ],
  "Assam": [
    { name: "KAMRUP DIVISION", points: "10,20 48,20 48,80 10,80", textX: 29, textY: 25, colorClass: "fill-amber-500/[0.015] stroke-amber-500/20", textColorClass: "fill-amber-400/85" },
    { name: "JORHAT DIVISION", points: "52,20 90,20 90,80 52,80", textX: 71, textY: 25, colorClass: "fill-rose-500/[0.015] stroke-rose-500/20", textColorClass: "fill-rose-400/85" }
  ],
  "Nagaland": [
    { name: "CHIEPHOBOZOU REGION", points: "15,20 50,15 45,75 20,70", textX: 30, textY: 28, colorClass: "fill-cyan-500/[0.015] stroke-cyan-500/20", textColorClass: "fill-cyan-400/85" },
    { name: "TSEMINYU REGION", points: "50,15 85,20 80,75 45,75", textX: 68, textY: 28, colorClass: "fill-indigo-500/[0.015] stroke-indigo-500/20", textColorClass: "fill-indigo-400/85" }
  ],
  "Telangana": [
    { name: "CHOUTUPPAL REGION", points: "15,20 50,15 45,80 15,75", textX: 30, textY: 28, colorClass: "fill-rose-500/[0.015] stroke-rose-500/20", textColorClass: "fill-rose-400/85" },
    { name: "RAMANNAPET REGION", points: "50,15 85,20 80,75 45,80", textX: 68, textY: 28, colorClass: "fill-emerald-500/[0.015] stroke-emerald-500/20", textColorClass: "fill-emerald-400/85" }
  ],
  "Tamil Nadu": [
    { name: "SRIPERUMBUDUR REGION", points: "15,20 50,15 45,75 20,70", textX: 30, textY: 28, colorClass: "fill-amber-500/[0.015] stroke-amber-500/20", textColorClass: "fill-amber-400/85" },
    { name: "KUNDRATHUR REGION", points: "50,15 85,20 80,75 45,75", textX: 68, textY: 28, colorClass: "fill-indigo-500/[0.015] stroke-indigo-500/20", textColorClass: "fill-indigo-400/85" }
  ]
};

// Realistic simulated images represented as visual data blocks in beautiful canvas
const SAMPLE_REGISTERS = {
  monsoon: {
    name: "Monsoon_Epidemic_Register_July2026.png",
    previewText: "Choutuppal PHC Ledger Log\nDate: 2026-07-07\n----\n1. Fever / 14 patients / Rx: Paracetamol [qty: 40]\n2. Malaria / 8 patients / Rx: Artesunate [qty: 12]\n3. Fever / 6 patients / Rx: Paracetamol [qty: 15]",
    base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  },
  summer: {
    name: "Summer_Waterborne_Log_June2026.png",
    previewText: "Ramannapet PHC Clinical Register\nDate: 2026-07-07\n----\n1. Diarrhea / 22 patients / Rx: ORS Packets [qty: 45]\n2. Diarrhea / 12 patients / Rx: ORS Packets [qty: 30]",
    base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }
};

export default function App() {
  const [lang, setLang] = useState<Language>("en");
  const [phcs, setPhcs] = useState<ClientPHCData[]>([]);
  const [transferLogs, setTransferLogs] = useState<ServerResponse["transferLogs"]>([]);
  const [simulationMode, setSimulationMode] = useState(true);
  const [selectedPhcId, setSelectedPhcId] = useState<string>("malihabad");
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPanX, setZoomPanX] = useState(0);
  const [zoomPanY, setZoomPanY] = useState(0);
  const [activeTab, setActiveTab] = useState<"dashboard" | "digitization" | "redistribution">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredPhcId, setHoveredPhcId] = useState<string | null>(null);
  const [mapViewTab, setMapViewTab] = useState<"india" | "district">("india");
  const [stateSearchQuery, setStateSearchQuery] = useState("");

  // Digitalized Register state
  type OcrState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  const [dragActive, setDragActive] = useState(false);
  const [ocrState, setOcrState] = useState<OcrState>('idle');
  const [ocrErrorMessage, setOcrErrorMessage] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [digitizedRecords, setDigitizedRecords] = useState<DigitizedRecord[]>([]);
  const [editableRecords, setEditableRecords] = useState<DigitizedRecord[]>([]);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);

  // Redistribution states
  const [sourcePhcId, setSourcePhcId] = useState("");
  const [selectedDrug, setSelectedDrug] = useState("");
  const [transferQty, setTransferQty] = useState<number>(50);
  const [draftText, setDraftText] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [redistributeSuccess, setRedistributeSuccess] = useState("");

  // Deep Explanation states
  const [explainingSymptom, setExplainingSymptom] = useState<string | null>(null);
  const [explanationTexts, setExplanationTexts] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS["en"][key] || key;
  };

  const [activeState, setActiveState] = useState<string>("Uttar Pradesh");
  const selectedPhc = phcs.find((p) => p.id === selectedPhcId);

  // Sync activeState when a PHC is selected
  useEffect(() => {
    if (selectedPhc) {
      const phcState = selectedPhc.state || PHC_GEOGRAPHY[selectedPhc.id]?.state || "Uttar Pradesh";
      setActiveState(phcState);
    }
  }, [selectedPhcId, phcs]);

  const [indiaGeoJson, setIndiaGeoJson] = useState<any>(null);

  useEffect(() => {
    fetch("https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load high-resolution India map data");
        return res.json();
      })
      .then((data) => {
        setIndiaGeoJson(data);
      })
      .catch((err) => {
        console.warn("India map boundaries using fallback vector data:", err.message);
      });
  }, []);

  // Load facilities on initial load
  const loadPHCs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/phcs");
      const data: ServerResponse = await response.json();
      setPhcs(data.phcs);
      setTransferLogs(data.transferLogs);
      setSimulationMode(data.simulationMode);
    } catch (e) {
      console.error("Failed to fetch PHC database:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPHCs();
  }, []);

  const handleReset = async () => {
    try {
      await fetch("/api/phcs/reset", { method: "POST" });
      await loadPHCs();
      setDigitizedRecords([]);
      setDraftText("");
      setExplanationTexts({});
      setRedistributeSuccess("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSimulation = async () => {
    try {
      const response = await fetch("/api/simulation/toggle", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setSimulationMode(data.simulationMode);
      }
    } catch (e) {
      console.error("Failed to toggle simulation mode:", e);
    }
  };

  // Drag and Drop uploader
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Trigger Gemini Digitization OCR with robust state machine, validation, and timeout
  const processImageFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setOcrState('error');
      setOcrErrorMessage("Invalid file format. Please upload JPG, PNG, WebP or PDF.");
      return;
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setOcrState('error');
      setOcrErrorMessage("File size exceeds 10MB limit. Please upload a smaller file.");
      return;
    }

    setOcrState('uploading');
    setOcrErrorMessage(null);

    const reader = new FileReader();
    reader.onloadstart = () => setOcrState('uploading');
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setSelectedImagePreview(base64data);
      triggerDigitization(base64data);
    };
    reader.onerror = () => {
      setOcrState('error');
      setOcrErrorMessage("Failed to read uploaded file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const triggerDigitization = async (base64: string, previewUrl?: string) => {
    if (previewUrl) {
      setSelectedImagePreview(previewUrl);
    }
    setOcrState('processing');
    setOcrErrorMessage(null);
    setOcrWarning(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40s timeout

    try {
      const response = await fetch("/api/phcs/digitize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phcId: selectedPhcId,
          imageBase64: base64,
          language: lang
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "OCR digitization API returned an error.");
      }

      setDigitizedRecords(data.records);
      setEditableRecords(data.records);
      if (data.warning) {
        setOcrWarning(data.warning);
      }
      setOcrState('success');
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("OCR Digitization error:", err);
      setOcrState('error');
      if (err.name === 'AbortError') {
        setOcrErrorMessage("OCR request timed out after 40 seconds. Please try again with a smaller image or check network.");
      } else {
        setOcrErrorMessage(err.message || "OCR digitization failed. Please check connection and try again.");
      }
    }
  };

  const handleRecordChange = (index: number, field: keyof DigitizedRecord, value: any) => {
    const updated = [...editableRecords];
    updated[index] = { ...updated[index], [field]: value };
    setEditableRecords(updated);
    setDigitizedRecords(updated);
  };

  const commitDigitizedLedger = async () => {
    // Digitization logs are automatically saved & subtracted in our server state
    // We simply reload the main PHC data to see the live updates reflected instantly!
    await loadPHCs();
    setDigitizedRecords([]);
    setEditableRecords([]);
    setOcrState('idle');
    setSelectedImagePreview(null);
    alert("Extracted patient logs committed successfully. Clinic inventories and epidemic trend curves updated.");
  };

  // Draft Redistribution Order via Gemini
  const handleDraftOrder = async () => {
    if (!sourcePhcId || !selectedDrug || !selectedPhc) return;
    setDrafting(true);
    setRedistributeSuccess("");
    try {
      const response = await fetch("/api/phcs/redistribute-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePhcId,
          targetPhcId: selectedPhc.id,
          drugName: selectedDrug,
          quantity: transferQty,
          language: lang
        })
      });
      const data = await response.json();
      if (data.success) {
        setDraftText(data.draftText);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDrafting(false);
    }
  };

  const handleApproveRedistribution = async () => {
    if (!sourcePhcId || !selectedDrug || !selectedPhc) return;
    try {
      const response = await fetch("/api/phcs/redistribute-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePhcId,
          targetPhcId: selectedPhc.id,
          drugName: selectedDrug,
          quantity: transferQty
        })
      });
      const data = await response.json();
      if (data.success) {
        setRedistributeSuccess(`Successfully dispatched ${transferQty} ${selectedDrug} in real-time!`);
        setDraftText("");
        setPhcs(data.phcs);
        setTransferLogs(data.transferLogs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Request Deep AI Epidemiological Justification from Gemini
  const handleRequestExplanation = async (symptom: string, score: number, currentLevel: number) => {
    setExplainingSymptom(symptom);
    try {
      const response = await fetch("/api/phcs/explain-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phcId: selectedPhcId,
          symptom,
          score,
          currentLevel,
          language: lang
        })
      });
      const data = await response.json();
      if (data.success) {
        setExplanationTexts((prev) => ({
          ...prev,
          [symptom]: data.explanation
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExplainingSymptom(null);
    }
  };

  // Filter and compute total stats for district
  const filteredPhcs = phcs.filter((p) => {
    // If in State-Wise PHC Network view, restrict list to facilities inside activeState
    if (mapViewTab === "district" && p.state && p.state.toUpperCase() !== activeState.toUpperCase()) {
      return false;
    }
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.location && p.location.toLowerCase().includes(term)) ||
      (p.state && p.state.toLowerCase().includes(term)) ||
      (p.district && p.district.toLowerCase().includes(term)) ||
      p.riskAnalysis.status.toLowerCase().includes(term)
    );
  });

  // Precompute collision-detected/offset coordinates for India map pins
  const indiaCoords = useMemo(() => {
    const coordsMap: Record<string, { x: number; y: number }> = {};
    const groups: Array<{ center: { x: number; y: number }; items: ClientPHCData[] }> = [];
    const threshold = 3.5; // Collision detection distance in SVG coordinates

    for (const phc of phcs) {
      const geo = PHC_GEOGRAPHY[phc.id];
      const lat = phc.latitude ?? geo?.lat;
      const lon = phc.longitude ?? geo?.lon;
      if (!lat || !lon) continue;
      const coords = getIndiaXY(lat, lon);

      let placed = false;
      for (const group of groups) {
        const dx = coords.x - group.center.x;
        const dy = coords.y - group.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          group.items.push(phc);
          placed = true;
          break;
        }
      }

      if (!placed) {
        groups.push({
          center: { ...coords },
          items: [phc]
        });
      }
    }

    for (const group of groups) {
      const count = group.items.length;
      if (count === 1) {
        coordsMap[group.items[0].id] = group.center;
      } else {
        const radius = threshold * 0.75;
        group.items.forEach((phc, index) => {
          const angle = (index * 2 * Math.PI) / count;
          coordsMap[phc.id] = {
            x: group.center.x + radius * Math.cos(angle),
            y: group.center.y + radius * Math.sin(angle)
          };
        });
      }
    }

    return coordsMap;
  }, [phcs]);

  // Precompute collision-detected/offset coordinates for Local District/State map
  const districtCoords = useMemo(() => {
    const coordsMap: Record<string, { x: number; y: number }> = {};
    const groups: Array<{ center: { x: number; y: number }; items: ClientPHCData[] }> = [];
    const threshold = 4.0; // Visually pleasant local coordinate spacing

    // Filter to active state to handle overlaps localized within this map projection
    const activeStatePhcs = phcs.filter(p => p.state && p.state.toUpperCase() === activeState.toUpperCase());

    for (const phc of activeStatePhcs) {
      const coords = getLocalCoords(phc);
      if (!coords) continue;

      let placed = false;
      for (const group of groups) {
        const dx = coords.x - group.center.x;
        const dy = coords.y - group.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          group.items.push(phc);
          placed = true;
          break;
        }
      }

      if (!placed) {
        groups.push({
          center: { ...coords },
          items: [phc]
        });
      }
    }

    for (const group of groups) {
      const count = group.items.length;
      if (count === 1) {
        coordsMap[group.items[0].id] = group.center;
      } else {
        const radius = threshold * 0.75;
        group.items.forEach((phc, index) => {
          const angle = (index * 2 * Math.PI) / count;
          coordsMap[phc.id] = {
            x: group.center.x + radius * Math.cos(angle),
            y: group.center.y + radius * Math.sin(angle)
          };
        });
      }
    }

    return coordsMap;
  }, [phcs, activeState]);

  const calculateDistanceKm = (phc1: any, phc2: any) => {
    const geo1 = PHC_GEOGRAPHY[phc1.id] || { lat: phc1.latitude || 26, lon: phc1.longitude || 80 };
    const geo2 = PHC_GEOGRAPHY[phc2.id] || { lat: phc2.latitude || 26, lon: phc2.longitude || 80 };
    const R = 6371; // Earth radius in km
    const dLat = (geo2.lat - geo1.lat) * (Math.PI / 180);
    const dLon = (geo2.lon - geo1.lon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(geo1.lat * (Math.PI / 180)) * Math.cos(geo2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Automatically find potential surplus facilities for selected deficit drug within ~500km range without letting source PHC suffer
  const findSurplusFacilities = (drugName: string) => {
    if (!selectedPhc) return [];
    return phcs.filter((p) => {
      const stock = p.stock[drugName];
      if (!stock || p.id === selectedPhc.id) return false;
      const dist = calculateDistanceKm(selectedPhc, p);
      if (dist > 500) return false; // Within ~500km logistical range

      // Ensure source PHC won't suffer by accounting for its own forecast trends
      let sourceForecastDemand = 0;
      p.forecasts.forEach(f => {
        if (f.currentTrend === "rising") {
          sourceForecastDemand += Math.round(f.projectedCount * 0.1);
        }
      });

      const safeSurplusBuffer = stock.minRequired + sourceForecastDemand;
      const trueSurplus = stock.current - safeSurplusBuffer;
      return trueSurplus > 15; // Must have genuine safe surplus after safeguarding its own needs
    });
  };

  const getRecommendedTransferQty = (sourceId: string) => {
    if (!selectedPhc || !selectedDrug) return 50;
    const targetStock = selectedPhc.stock[selectedDrug];
    const sourcePhc = phcs.find(p => p.id === sourceId);
    if (!targetStock || !sourcePhc) return 50;

    const currentDeficit = Math.max(0, targetStock.minRequired - targetStock.current);
    let forecastExtraNeed = 0;
    selectedPhc.forecasts.forEach(f => {
      if (f.currentTrend === "rising") {
        forecastExtraNeed += Math.round(f.projectedCount * 0.15);
      }
    });

    const totalNeeded = currentDeficit + forecastExtraNeed;

    // Calculate safe available surplus at source without source PHC suffering
    let sourceForecastDemand = 0;
    sourcePhc.forecasts.forEach(f => {
      if (f.currentTrend === "rising") {
        sourceForecastDemand += Math.round(f.projectedCount * 0.1);
      }
    });

    const sourceStock = sourcePhc.stock[selectedDrug];
    const safeSurplusAvailable = sourceStock.current - (sourceStock.minRequired + sourceForecastDemand);
    
    return Math.max(10, Math.min(Math.max(0, safeSurplusAvailable), totalNeeded || 50));
  };

  // Recharts structured timeline parser
  const getTimelineData = () => {
    if (!selectedPhc) return [];
    const days = Array.from({ length: 14 }, (_, i) => `Day ${i + 1}`);
    return days.map((day, idx) => {
      const dataPoint: any = { day };
      Object.keys(selectedPhc.symptomHistory).forEach((symptom) => {
        dataPoint[symptom] = selectedPhc.symptomHistory[symptom][idx];
      });
      dataPoint["Rainfall"] = selectedPhc.rainfallHistory[idx];
      dataPoint["Temp"] = selectedPhc.tempHistory[idx];
      return dataPoint;
    });
  };

  const countByStatus = (status: "red" | "amber" | "green") => {
    const list = mapViewTab === "district"
      ? phcs.filter(p => p.state && p.state.toUpperCase() === activeState.toUpperCase())
      : phcs;
    return list.filter((p) => p.riskAnalysis.status === status).length;
  };

  return (
    <div id="root-container" className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* HEADER SECTION */}
      <header id="main-header" className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/15 p-2.5 rounded-xl border border-red-500/30">
              <Activity className="h-6 w-6 text-red-400 animate-pulse" />
            </div>
            <div>
              <h1 id="portal-title" className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                {t("title")}
                <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono uppercase">
                  v1.2 Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">{t("subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Language Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Globe className="h-4 w-4 text-slate-400" />
              <select
                id="language-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="bg-transparent text-sm font-semibold text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>English (EN)</option>
                <option value="hi" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>हिन्दी (HI)</option>
                <option value="te" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>తెలుగు (TE)</option>
                <option value="mr" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>मराठी (MR)</option>
                <option value="bn" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>বাংলা (BN)</option>
                <option value="kn" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>ಕನ್ನಡ (KN)</option>
                <option value="ta" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>தமிழ் (TA)</option>
                <option value="ml" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>മലയാളം (ML)</option>
                <option value="gu" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>ગુજરાતી (GU)</option>
                <option value="pa" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>ਪੰਜਾਬੀ (PA)</option>
                <option value="or" className="bg-slate-900 text-slate-100" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>ଓଡ଼ିଆ (OR)</option>
              </select>
            </div>

            {/* AI Engine Status Badge */}
            <button
              id="ai-engine-toggle-btn"
              onClick={handleToggleSimulation}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-all cursor-pointer hover:bg-opacity-85 active:scale-95 ${
                simulationMode 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
              }`}
              title="Click to toggle between Gemini live API and Offline simulation model"
            >
              <Sparkles className={`h-3.5 w-3.5 ${simulationMode ? "text-amber-400" : "text-emerald-400"}`} />
              <span>{simulationMode ? t("simulationNotice") : t("activeEngine")}</span>
            </button>

            {/* Reset Seed Data */}
            <button
              id="reset-database-btn"
              onClick={handleReset}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 py-2 px-3 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Re-seed in-memory clinic stocks and case timelines"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("resetBtn")}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        
        {/* DISTRICT TELEMETRY METRICS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">CRITICAL RED PHCs</p>
              <h3 className="text-2xl font-black text-red-500 mt-1">{countByStatus("red")}</h3>
            </div>
            <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <ShieldAlert className="h-5 w-5 text-red-400" />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">WATCH AMBER PHCs</p>
              <h3 className="text-2xl font-black text-amber-500 mt-1">{countByStatus("amber")}</h3>
            </div>
            <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">STABLE GREEN PHCs</p>
              <h3 className="text-2xl font-black text-emerald-500 mt-1">{countByStatus("green")}</h3>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">DISTRICT STOCKS REDISTRIBUTED</p>
              <h3 className="text-2xl font-black text-indigo-400 mt-1">{transferLogs.length}</h3>
            </div>
            <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
              <Truck className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* TWO COLUMN GRID: LEFT DISTRICT COMMAND, RIGHT SELECTED PHC VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: DISTRICT OPERATIONS HUD (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* REAL-TIME DISTRICT & NATIONAL EPIDEMIOLOGY MAP */}
            <section id="district-realtime-map" className="flex flex-col bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-indigo-400 animate-pulse" />
                      REAL-TIME EPIDEMIOLOGICAL MAP
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono">India National Grid & Localized Operations</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
                    LIVE INTERACTIVE
                  </span>
                </div>

                {/* Segmented Control Map View Tabs */}
                <div className="flex border border-slate-900 bg-slate-950 p-1 rounded-lg">
                  <button
                    onClick={() => setMapViewTab("india")}
                    className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider transition-all rounded-md cursor-pointer ${
                      mapViewTab === "india"
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    🇮🇳 INDIA NATIONAL GRID
                  </button>
                  <button
                    onClick={() => setMapViewTab("district")}
                    className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider transition-all rounded-md cursor-pointer ${
                      mapViewTab === "district"
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    📍 STATE-WISE PHC NETWORK
                  </button>
                </div>

                {/* Searchable State/UT selectbox and PHC list for State-wise PHC View */}
                {mapViewTab === "district" && (
                  <div className="flex flex-col gap-2 bg-slate-950 p-2.5 border border-slate-900 rounded-lg">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Search State/UT & PHCs:
                      </label>
                      <span className="text-[9px] font-mono text-indigo-400">{activeState}</span>
                    </div>

                    {/* State Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search state (e.g. Uttar Pradesh, Kerala)..."
                        value={stateSearchQuery}
                        onChange={(e) => setStateSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <select
                      id="state-select-dropdown"
                      value={activeState}
                      onChange={(e) => {
                        const targetState = e.target.value;
                        setActiveState(targetState);
                        const statePhcs = phcs.filter(p => p.state && p.state.toUpperCase() === targetState.toUpperCase());
                        if (statePhcs.length > 0) {
                          setSelectedPhcId(statePhcs[0].id);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {Object.keys(STATE_CENTERS)
                        .filter(s => s.toLowerCase().includes(stateSearchQuery.toLowerCase()))
                        .sort()
                        .map((stateName) => {
                          const nodesCount = phcs.filter(p => p.state && p.state.toUpperCase() === stateName.toUpperCase()).length;
                          return (
                            <option key={stateName} value={stateName}>
                              {stateName.toUpperCase()} ({nodesCount} Clinics)
                            </option>
                          );
                        })}
                    </select>

                    {/* List of all PHCs in selected state */}
                    <div className="mt-1 flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-1">
                      <div className="text-[8px] font-mono text-slate-400 uppercase">
                        Clinics in {activeState} ({phcs.filter(p => p.state && p.state.toUpperCase() === activeState.toUpperCase()).length}):
                      </div>
                      {phcs
                        .filter(p => p.state && p.state.toUpperCase() === activeState.toUpperCase())
                        .map((phc) => {
                          const isSelected = phc.id === selectedPhcId;
                          const statusColor = phc.riskAnalysis.status === "red"
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : phc.riskAnalysis.status === "amber"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
                          return (
                            <div
                              key={`state-phc-item-${phc.id}`}
                              onClick={() => {
                                setSelectedPhcId(phc.id);
                                setRedistributeSuccess("");
                                setDraftText("");
                              }}
                              className={`flex items-center justify-between p-1.5 rounded cursor-pointer border transition-all ${
                                isSelected
                                  ? "bg-indigo-950/60 border-indigo-500/50 text-white"
                                  : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold font-sans">{phc.name}</span>
                                <span className="text-[8px] font-mono text-slate-400">{phc.district || "District"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${statusColor}`}>
                                  {phc.riskAnalysis.score} pts
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Map Canvas Frame */}
              <div className="relative border border-slate-900 rounded-xl bg-slate-950 overflow-hidden group">
                {mapViewTab === "india" ? (
                  /* 🇮🇳 HIGH-FIDELITY NATIONAL MAP OF INDIA */
                  <div className="relative w-full h-auto">
                    {/* Google Maps Style Search Overlay */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg py-1 px-2.5 backdrop-blur-sm max-w-[180px] shadow-lg">
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search PHCs..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-transparent text-[10px] text-white focus:outline-none w-full font-sans"
                      />
                    </div>

                    {/* Google Maps Style Layer Switcher Overlay */}
                    <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                      <div className="bg-slate-900/95 border border-slate-800 rounded px-2 py-1 text-[8px] font-mono font-bold text-indigo-400 flex items-center gap-1.5 shadow-md">
                        <Layers className="h-3 w-3 text-indigo-400" />
                        <span>MAP TERRAIN</span>
                      </div>
                    </div>

                    {/* Google Maps Style Scale & Attribution Footer Overlay */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none text-[8px] font-mono text-slate-500 z-10 bg-slate-950/40 px-1 py-0.5 rounded">
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-[2px] bg-slate-500 relative">
                          <div className="absolute left-0 top-[-2px] h-[6px] w-[2px] bg-slate-500"></div>
                          <div className="absolute right-0 top-[-2px] h-[6px] w-[2px] bg-slate-500"></div>
                        </div>
                        <span>500 km</span>
                      </div>
                      <span>© 2026 Google Maps API</span>
                    </div>

                    <svg viewBox="0 0 100 120" className="w-full h-auto max-h-[300px] select-none">
                      <defs>
                        <pattern id="india-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="0.4" />
                        </pattern>
                        <radialGradient id="india-glow" cx="51%" cy="37%" r="20%">
                          <stop offset="0%" stopColor="rgba(99, 102, 241, 0.2)" />
                          <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
                        </radialGradient>
                      </defs>
                      <rect width="100" height="120" fill="url(#india-grid)" />
                      
                      {/* Glowing aura over selected state cluster */}
                      {(() => {
                        const activeHighlight = STATE_HIGHLIGHTS.find(h => h.name === activeState.toUpperCase()) || STATE_HIGHLIGHTS[0];
                        return (
                          <circle cx={activeHighlight.labelX} cy={activeHighlight.labelY} r="14" fill="url(#india-glow)" className="animate-pulse pointer-events-none" />
                        );
                      })()}

                      {/* Highly-polished custom India outer path & State boundaries */}
                      {indiaGeoJson ? (
                        <>
                          {indiaGeoJson.features.map((feature: any, idx: number) => {
                            const stateName = feature.properties.state_name || feature.properties.ST_NM || "";
                            const isSelectedState = stateName.toUpperCase() === activeState.toUpperCase();
                            const pathD = convertFeatureToSvgPath(feature);
                            if (!pathD) return null;
                            return (
                              <path
                                key={`geojson-state-${idx}`}
                                d={pathD}
                                className={`transition-all duration-200 ${
                                  isSelectedState
                                    ? "fill-indigo-500/15 stroke-indigo-400 stroke-[0.35]"
                                    : "fill-transparent stroke-slate-700/40 stroke-[0.2]"
                                }`}
                              />
                            );
                          })}
                          
                          {/* State Labels over the high-resolution boundaries */}
                          {STATE_HIGHLIGHTS.map((sh) => {
                            const isSelectedState = sh.name === activeState.toUpperCase();
                            return (
                              <text
                                key={`geojson-label-${sh.name}`}
                                x={sh.labelX}
                                y={sh.labelY}
                                className={`text-[1.8px] font-mono tracking-wider font-bold transition-colors pointer-events-none ${
                                  isSelectedState ? "fill-indigo-300" : "fill-slate-500/40"
                                }`}
                                textAnchor="middle"
                              >
                                {sh.name}
                              </text>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          {/* Highly-polished custom India outer path */}
                          <path
                            d="M 45,5 L 48,3 L 52,5 L 54,12 L 51,16 L 53,20 L 58,22 L 56,26 L 60,30 L 64,30 L 68,34 L 72,32 L 76,36 L 79,40 L 76,44 L 79,48 L 84,48 L 88,44 L 92,44 L 95,48 L 92,52 L 87,52 L 83,50 L 80,54 L 81,58 L 83,62 L 81,65 L 77,65 L 75,60 L 71,58 L 68,60 L 64,64 L 62,68 L 58,74 L 54,82 L 48,92 L 45,100 L 44,105 L 42,108 L 41,105 L 38,98 L 35,90 L 32,82 L 29,75 L 26,68 L 22,62 L 18,58 L 12,55 L 8,50 L 10,45 L 14,44 L 18,48 L 24,46 L 28,42 L 32,38 L 36,34 L 38,30 L 41,25 L 43,20 L 42,15 Z"
                            className="fill-slate-900/50 stroke-slate-800 stroke-[0.8] transition-colors group-hover:stroke-slate-700/80"
                          />

                          {/* State border highlights */}
                          {STATE_HIGHLIGHTS.map((sh) => {
                            const isSelectedState = sh.name === activeState.toUpperCase();
                            return (
                              <g key={sh.name}>
                                <path
                                  d={sh.path}
                                  className={`transition-colors duration-200 ${
                                    isSelectedState
                                      ? "fill-indigo-500/15 stroke-indigo-400 stroke-[0.4]"
                                      : "fill-indigo-500/5 stroke-indigo-500/20 stroke-[0.25]"
                                  }`}
                                />
                                <text
                                  x={sh.labelX}
                                  y={sh.labelY}
                                  className={`text-[1.8px] font-mono tracking-wider font-bold transition-colors ${
                                    isSelectedState ? "fill-indigo-300" : "fill-slate-500/50"
                                  }`}
                                  textAnchor="middle"
                                >
                                  {sh.name}
                                </text>
                              </g>
                            );
                          })}
                        </>
                      )}

                      {/* India Map Pins for each PHC plotted using getIndiaXY */}
                      {[...phcs]
                        .sort((a, b) => {
                          const scoreA = a.id === selectedPhcId ? 1 : 0;
                          const scoreB = b.id === selectedPhcId ? 1 : 0;
                          return scoreA - scoreB;
                        })
                        .map((phc) => {
                          const geo = PHC_GEOGRAPHY[phc.id];
                          const lat = phc.latitude ?? geo?.lat;
                          const lon = phc.longitude ?? geo?.lon;
                          if (!lat || !lon) return null;
                          const coords = indiaCoords[phc.id];
                          if (!coords) return null;
                          const { x, y } = coords;

                        const isMatched = filteredPhcs.some((fp) => fp.id === phc.id);
                        const isSelected = phc.id === selectedPhcId;
                        const isHovered = phc.id === hoveredPhcId;

                        const color = phc.riskAnalysis.status === "red"
                          ? "#ef4444" 
                          : phc.riskAnalysis.status === "amber"
                            ? "#f59e0b" 
                            : "#10b981";

                        return (
                          <g
                            key={phc.id}
                            transform={`translate(${x}, ${y})`}
                            className="cursor-pointer group/pin"
                            onClick={() => {
                              setSelectedPhcId(phc.id);
                              setRedistributeSuccess("");
                              setDraftText("");
                            }}
                            onMouseEnter={() => setHoveredPhcId(phc.id)}
                            onMouseLeave={() => setHoveredPhcId(null)}
                            style={{ opacity: isMatched ? 1 : 0.2 }}
                          >
                            {/* Pulsing ring for selected pin */}
                            {isSelected && (
                              <circle
                                cx="0"
                                cy="0"
                                r="4.5"
                                className="animate-ping fill-indigo-500/20 pointer-events-none"
                              />
                            )}

                            {/* Pin Shadow */}
                            <ellipse
                              cx="0"
                              cy="0.2"
                              rx="1.0"
                              ry="0.4"
                              fill="black"
                              opacity="0.5"
                            />

                            {/* Google-like Teardrop Pin Shape */}
                            <path
                              d="M 0,0 C -1.5,-1.5 -2.5,-3 -2.5,-4.5 A 2.5,2.5 0 1,1 2.5,-4.5 C 2.5,-3 1.5,-1.5 0,0 Z"
                              fill={color}
                              stroke="#020617"
                              strokeWidth="0.3"
                              className="transition-transform duration-150 group-hover/pin:scale-125"
                              style={{ transformOrigin: "bottom center", transformBox: "fill-box" }}
                            />

                            {/* Pin Center Core */}
                            <circle
                              cx="0"
                              cy="-4.5"
                              r="0.7"
                              fill="white"
                            />

                            {(isSelected || isHovered) && (
                              <g className="pointer-events-none" transform="translate(0, -6)">
                                <rect
                                  x="-14"
                                  y="-10"
                                  width="28"
                                  height="6"
                                  rx="0.5"
                                  className="fill-slate-950/95 stroke-slate-800/80 stroke-[0.15]"
                                />
                                <text
                                  x="0"
                                  y="-6.5"
                                  textAnchor="middle"
                                  className="text-[1.8px] font-mono font-bold fill-white"
                                >
                                  {phc.name.replace(" PHC", "").replace(" CHC", "")}
                                </text>
                                <text
                                  x="0"
                                  y="-5.2"
                                  textAnchor="middle"
                                  className="text-[1.2px] font-mono fill-slate-400"
                                >
                                  {phc.district || geo?.district || "Unknown District"}, {phc.state || geo?.state || "Unknown State"} ({lat.toFixed(2)}°, {lon.toFixed(2)}°)
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  /* 📍 ZOOMED STATE TERRITORIAL MAP ON COUNTRY GRID */
                  <div className="relative w-full h-auto">
                    {/* Zoom / Pan HUD Overlay */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg backdrop-blur-sm shadow-xl">
                      <div className="text-[7px] text-slate-500 font-mono uppercase tracking-wider text-center mb-0.5">Map Zoom</div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setZoomScale(z => Math.min(4, z + 0.5))} 
                          className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold bg-slate-800 hover:bg-indigo-500/30 text-white rounded transition cursor-pointer border border-slate-700 hover:border-indigo-500/50"
                          title="Zoom In"
                        >
                          ＋
                        </button>
                        <button 
                          onClick={() => setZoomScale(z => Math.max(1, z - 0.5))} 
                          className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold bg-slate-800 hover:bg-indigo-500/30 text-white rounded transition cursor-pointer border border-slate-700 hover:border-indigo-500/50"
                          title="Zoom Out"
                        >
                          －
                        </button>
                        <button 
                          onClick={() => { setZoomScale(1); setZoomPanX(0); setZoomPanY(0); }} 
                          className="w-5 h-5 flex items-center justify-center text-[9px] font-mono bg-slate-800 hover:bg-indigo-500/30 text-white rounded transition cursor-pointer border border-slate-700 hover:border-indigo-500/50"
                          title="Reset View"
                        >
                          ↺
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const activeHighlight = STATE_HIGHLIGHTS.find(h => h.name === activeState.toUpperCase()) || STATE_HIGHLIGHTS[0];
                      let vbX = (activeHighlight?.labelX || 50) - 20;
                      let vbY = (activeHighlight?.labelY || 50) - 20;
                      let vbW = 40;
                      let vbH = 40;

                      if (indiaGeoJson) {
                        const activeFeature = indiaGeoJson.features.find((f: any) => {
                          const sName = (f.properties.state_name || f.properties.ST_NM || "").trim().toUpperCase();
                          return sName === activeState.toUpperCase();
                        });
                        if (activeFeature) {
                          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                          const processCoords = (coords: any) => {
                            if (!Array.isArray(coords)) return;
                            if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                              const { x, y } = getIndiaXY(coords[1], coords[0]);
                              if (x < minX) minX = x;
                              if (y < minY) minY = y;
                              if (x > maxX) maxX = x;
                              if (y > maxY) maxY = y;
                            } else {
                              coords.forEach(processCoords);
                            }
                          };
                          if (activeFeature.geometry && activeFeature.geometry.coordinates) {
                            processCoords(activeFeature.geometry.coordinates);
                          }
                          if (minX !== Infinity) {
                            const pad = 6;
                            vbX = minX - pad;
                            vbY = minY - pad;
                            vbW = Math.max(25, maxX - minX + pad * 2);
                            vbH = Math.max(25, maxY - minY + pad * 2);
                          }
                        }
                      }

                      const centerX = vbX + vbW / 2;
                      const centerY = vbY + vbH / 2;

                      return (
                        <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className="w-full h-auto max-h-[300px] select-none">
                          <defs>
                            <pattern id="state-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="0.4" />
                            </pattern>
                            <radialGradient id="state-glow" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.25)" />
                              <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
                            </radialGradient>
                          </defs>
                          <rect width="100" height="120" fill="url(#state-grid)" />
                          
                          <circle cx={centerX} cy={centerY} r="18" fill="url(#state-glow)" className="animate-pulse pointer-events-none" />

                          <g transform={`translate(${zoomPanX}, ${zoomPanY}) scale(${zoomScale})`} style={{ transformOrigin: `${centerX}px ${centerY}px`, transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                            {indiaGeoJson ? (
                              indiaGeoJson.features.map((feature: any, idx: number) => {
                                const stateName = feature.properties.state_name || feature.properties.ST_NM || "";
                                const isSelectedState = stateName.toUpperCase() === activeState.toUpperCase();
                                const pathD = convertFeatureToSvgPath(feature);
                                if (!pathD) return null;
                                return (
                                  <path
                                    key={`district-geojson-${idx}`}
                                    d={pathD}
                                    className={`transition-all duration-200 ${
                                      isSelectedState
                                        ? "fill-indigo-500/20 stroke-indigo-400 stroke-[0.4]"
                                        : "fill-slate-900/40 stroke-slate-700/30 stroke-[0.15]"
                                    }`}
                                  />
                                );
                              })
                            ) : (
                              STATE_HIGHLIGHTS.map((sh) => {
                                const isSelectedState = sh.name === activeState.toUpperCase();
                                return (
                                  <path
                                    key={sh.name}
                                    d={sh.path}
                                    className={`transition-all duration-200 ${
                                      isSelectedState
                                        ? "fill-indigo-500/20 stroke-indigo-400 stroke-[0.4]"
                                        : "fill-slate-900/40 stroke-slate-700/30 stroke-[0.15]"
                                    }`}
                                  />
                                );
                              })
                            )}

                            {/* State Title Banner inside map */}
                            <text
                              x={centerX}
                              y={vbY + 5}
                              textAnchor="middle"
                              className="text-[2px] font-mono font-extrabold fill-indigo-300 tracking-widest uppercase drop-shadow"
                            >
                              📍 {activeState} TERRITORIAL COMMAND
                            </text>

                            {/* PHC Pins inside active state */}
                            {[...phcs]
                              .filter(phc => phc.state && phc.state.toUpperCase() === activeState.toUpperCase())
                              .sort((a, b) => {
                                const scoreA = a.id === selectedPhcId ? 1 : 0;
                                const scoreB = b.id === selectedPhcId ? 1 : 0;
                                return scoreA - scoreB;
                              })
                              .map((phc) => {
                                const coords = indiaCoords[phc.id];
                                if (!coords) return null;

                                const isMatched = filteredPhcs.some((fp) => fp.id === phc.id);
                                const isSelected = phc.id === selectedPhcId;
                                const isHovered = phc.id === hoveredPhcId;

                                const color = phc.riskAnalysis.status === "red"
                                  ? "#ef4444" 
                                  : phc.riskAnalysis.status === "amber"
                                    ? "#f59e0b" 
                                    : "#10b981";

                                return (
                                  <g
                                    key={`state-phc-${phc.id}`}
                                    transform={`translate(${coords.x}, ${coords.y}) scale(${Math.max(0.18, 0.5 / Math.sqrt(zoomScale))})`}
                                    className="cursor-pointer group/pin"
                                    onClick={() => {
                                      setSelectedPhcId(phc.id);
                                      setRedistributeSuccess("");
                                      setDraftText("");
                                    }}
                                    onMouseEnter={() => setHoveredPhcId(phc.id)}
                                    onMouseLeave={() => setHoveredPhcId(null)}
                                    style={{ opacity: isMatched ? 1 : 0.3 }}
                                  >
                                    {isSelected && (
                                      <circle
                                        cx="0"
                                        cy="0"
                                        r="5"
                                        className="animate-ping fill-indigo-500/30 pointer-events-none"
                                      />
                                    )}

                                    <ellipse
                                      cx="0"
                                      cy="0.2"
                                      rx="1.2"
                                      ry="0.5"
                                      fill="black"
                                      opacity="0.6"
                                    />

                                    <path
                                      d="M 0,0 C -1.5,-1.5 -2.5,-3 -2.5,-4.5 A 2.5,2.5 0 1,1 2.5,-4.5 C 2.5,-3 1.5,-1.5 0,0 Z"
                                      fill={color}
                                      stroke="#020617"
                                      strokeWidth="0.3"
                                      className="transition-transform duration-150 group-hover/pin:scale-125"
                                      style={{ transformOrigin: "bottom center", transformBox: "fill-box" }}
                                    />

                                    <circle
                                      cx="0"
                                      cy="-4.5"
                                      r="0.7"
                                      fill="white"
                                    />

                                    {(isSelected || isHovered) && (
                                      <g className="pointer-events-none" transform="translate(0, -6)">
                                        <rect
                                          x="-14"
                                          y="-10"
                                          width="28"
                                          height="6"
                                          rx="0.5"
                                          className="fill-slate-950/95 stroke-indigo-500/60 stroke-[0.2]"
                                        />
                                        <text
                                          x="0"
                                          y="-6.5"
                                          textAnchor="middle"
                                          className="text-[1.8px] font-mono font-bold fill-white"
                                        >
                                          {phc.name.replace(" PHC", "").replace(" CHC", "")}
                                        </text>
                                        <text
                                          x="0"
                                          y="-5.2"
                                          textAnchor="middle"
                                          className="text-[1.2px] font-mono fill-slate-300"
                                        >
                                          {phc.district || "District"} ({phc.riskAnalysis.score} PTS)
                                        </text>
                                      </g>
                                    )}
                                  </g>
                                );
                              })}
                          </g>
                        </svg>
                      );
                    })()}
                  </div>
                )}

                {/* Legend bar */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-900/85 backdrop-blur-sm px-2.5 py-1.5 border border-slate-800 rounded-lg text-[9px] font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      Critical
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Watch
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Stable
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-500">Click node to inspect</span>
                </div>
              </div>

              {/* Live Info Readout Status HUD */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-900/60 pb-1.5">
                  <div>
                    <span className="text-slate-500 text-[9px] block">ACTIVE FACILITY:</span>
                    <strong className="text-white text-[11px] flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-indigo-400 shrink-0" />
                      {selectedPhc?.name || "NONE"}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[9px] block">COORDINATES:</span>
                    <span className="text-[11px] text-indigo-300 font-bold block mt-0.5">
                      {(() => {
                        const activePhc = selectedPhc;
                        if (!activePhc) return "N/A";
                        const lat = activePhc.latitude ?? PHC_GEOGRAPHY[activePhc.id]?.lat ?? 0;
                        const lon = activePhc.longitude ?? PHC_GEOGRAPHY[activePhc.id]?.lon ?? 0;
                        return `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/20 p-1.5 rounded-lg">
                  <div>
                    <span className="text-slate-500 text-[9px]">DISTRICT:</span>{" "}
                    <strong className="text-slate-200 block">
                      {(() => {
                        const activePhc = selectedPhc;
                        return activePhc ? (activePhc.district || PHC_GEOGRAPHY[activePhc.id]?.district || "Unknown") : "N/A";
                      })()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px]">STATE:</span>{" "}
                    <strong className="text-slate-200 block">
                      {(() => {
                        const activePhc = selectedPhc;
                        return activePhc ? (activePhc.state || PHC_GEOGRAPHY[activePhc.id]?.state || "Unknown") : "N/A";
                      })()}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-slate-500 text-[9px] block">CURRENT STATUS:</span>
                    <span className={`text-[10px] font-black uppercase flex items-center gap-1 mt-0.5 ${
                      (selectedPhc?.riskAnalysis.status === "red")
                        ? "text-red-400"
                        : (selectedPhc?.riskAnalysis.status === "amber")
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        (selectedPhc?.riskAnalysis.status === "red")
                          ? "bg-red-500 animate-pulse"
                          : (selectedPhc?.riskAnalysis.status === "amber")
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`} />
                      {(() => {
                        const phc = selectedPhc;
                        if (!phc) return "SELECT A FACILITY";
                        return `${phc.riskAnalysis.status.toUpperCase()} (${phc.riskAnalysis.score} PTS)`;
                      })()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[9px] block font-mono">RESOURCES OVERVIEW:</span>
                    <span className="text-slate-300 text-[10px] mt-0.5 block">
                      {(() => {
                        const phc = selectedPhc;
                        if (!phc) return "N/A";
                        return `${phc.bedsAvailable}/${phc.bedsTotal} Beds | ${phc.doctorAttendance}% Staff`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* LOWER LEFT: DISTRICT COMMAND PANEL (0-100 AUTO FLAGGING) */}
            <section id="district-command-view" className="flex flex-col bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-900 bg-slate-900/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-md font-bold text-white flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-indigo-400" />
                      {t("districtOverview")}
                    </h2>
                    <p className="text-xs text-slate-400">{t("autoFlagging")}</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                    {filteredPhcs.length} Facilities
                  </span>
                </div>

                {/* District Search Engine */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="district-search"
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 text-xs font-medium placeholder-slate-500 border border-slate-800 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-red-500/60 transition-colors"
                  />
                </div>
              </div>

              {/* Auto-flagging Facility List */}
              <div className="p-4 overflow-y-auto space-y-3 max-h-[380px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-xs text-slate-400 font-mono">
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-500 mr-2" />
                    LOADING TELEMETRY STREAM...
                  </div>
                ) : filteredPhcs.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    No health centers matched query indicators.
                  </div>
                ) : (
                  filteredPhcs
                    .sort((a, b) => b.riskAnalysis.score - a.riskAnalysis.score) // Sort RED-Critical on TOP!
                    .map((phc) => {
                      const r = phc.riskAnalysis;
                      const statusConfig = {
                        red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: t("statusRed") },
                        amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: t("statusAmber") },
                        green: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: t("statusGreen") }
                      }[r.status];

                      const isSelected = phc.id === selectedPhcId;

                      return (
                        <div
                          id={`phc-card-${phc.id}`}
                          key={phc.id}
                          onClick={() => {
                            setSelectedPhcId(phc.id);
                            setRedistributeSuccess("");
                            setDraftText("");
                          }}
                          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/5 scale-[1.01]"
                              : "bg-slate-900/30 border-slate-900 hover:border-slate-800"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div>
                              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                                {phc.name}
                                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                                  {phc.type}
                                </span>
                              </h3>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {phc.location}
                              </p>
                            </div>
                            
                            {/* Risk Score indicator */}
                            <div className="text-right">
                              <span className={`text-xs font-black font-mono px-2 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                                {r.score} PTS
                              </span>
                              <div className="text-[9px] text-slate-400 mt-1 font-mono">{statusConfig.label}</div>
                            </div>
                          </div>

                          {/* Critical Flag reason badges */}
                          <div className="space-y-1.5 mt-2.5 pt-2 border-t border-slate-900">
                            {r.reasons.map((reason, idx) => (
                              <div key={idx} className="flex items-start gap-1 text-[10px] text-slate-300">
                                <AlertCircle className={`h-3 w-3 shrink-0 mt-0.5 ${r.status === 'red' ? 'text-red-400' : 'text-amber-400'}`} />
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>

                          {/* Fast telemetry status tags */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-[9.5px] font-mono text-slate-400 pt-2 border-t border-slate-900/60">
                            <div>Type: <span className="text-indigo-300 font-bold">{phc.type}</span></div>
                            <div>State: <span className="text-slate-200 font-bold truncate max-w-[80px] inline-block align-bottom">{phc.state || "Uttar Pradesh"}</span></div>
                            <div>District: <span className="text-slate-300 truncate max-w-[80px] inline-block align-bottom">{phc.district || "Lucknow"}</span></div>
                            <div>Footfall: <span className="text-white font-extrabold">{phc.footfall_count ?? Math.floor(phc.doctorAttendance * 1.5)}</span></div>
                            <div>Doc Attended: <span className={phc.doctor_attended === "Yes" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{phc.doctor_attended ?? (phc.doctorAttendance > 50 ? "Yes" : "No")}</span></div>
                            <div>Beds Avail: <span className={phc.bed_available === "Yes" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{phc.bed_available ?? (phc.bedsAvailable > 0 ? "Yes" : "No")} ({phc.bedsAvailable})</span></div>
                            <div className="col-span-2">Kit Avail: <span className={phc.test_kit_available === "Yes" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{phc.test_kit_available ?? (phc.testKitsAvailable > 0 ? "Yes" : "No")} ({phc.testKitsAvailable} Kits)</span></div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </section>
          </div>

          {/* RIGHT: SELECTED CLINIC DETAILED VIEW - 7 COLS */}
          <section className="lg:col-span-7 space-y-6">
            {!selectedPhc ? (
              <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-12 text-center text-slate-400 text-sm">
                <Info className="h-8 w-8 text-slate-500 mx-auto mb-3" />
                {t("selectPhcPrompt")}
              </div>
            ) : (
              <div id="facility-view" className="space-y-6">
                
                {/* Modern Segmented Navigation Tabs */}
                <div className="flex border-b border-slate-900 overflow-x-auto scrollbar-none gap-2">
                  <button
                    id="tab-dashboard"
                    onClick={() => setActiveTab("dashboard")}
                    className={`flex items-center gap-2 py-3 px-4 text-xs font-bold font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "dashboard"
                        ? "border-indigo-500 text-white bg-indigo-500/5"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800"
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    {t("dashboardTab") || "Telemetry & Forecasts"}
                  </button>
                  <button
                    id="tab-digitization"
                    onClick={() => setActiveTab("digitization")}
                    className={`flex items-center gap-2 py-3 px-4 text-xs font-bold font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "digitization"
                        ? "border-indigo-500 text-white bg-indigo-500/5"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    {t("digitizationTab") || "Photo Digitizer (OCR)"}
                  </button>
                  <button
                    id="tab-redistribution"
                    onClick={() => setActiveTab("redistribution")}
                    className={`flex items-center gap-2 py-3 px-4 text-xs font-bold font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "redistribution"
                        ? "border-indigo-500 text-white bg-indigo-500/5"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800"
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    {t("redistributionTab") || "Stock Redistribution"}
                  </button>
                </div>

                {activeTab === "dashboard" && (
                  <>
                    {/* ACTIVE RISK INDICATOR BANNER */}
                <div className={`p-4 rounded-2xl border ${
                  selectedPhc.riskAnalysis.status === 'red'
                    ? "bg-gradient-to-r from-red-950/40 to-slate-950 border-red-500/30 text-red-100"
                    : selectedPhc.riskAnalysis.status === 'amber'
                    ? "bg-gradient-to-r from-amber-950/40 to-slate-950 border-amber-500/30 text-amber-100"
                    : "bg-gradient-to-r from-emerald-950/40 to-slate-950 border-emerald-500/30 text-emerald-100"
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        selectedPhc.riskAnalysis.status === 'red' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
                        selectedPhc.riskAnalysis.status === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
                        'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        <ShieldAlert className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold font-mono uppercase tracking-wide">
                          {selectedPhc.name} {t("riskScore")} - {selectedPhc.riskAnalysis.score}/100
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                          {selectedPhc.riskAnalysis.reasons[0]}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg border text-center ${
                      selectedPhc.riskAnalysis.status === 'red' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
                      selectedPhc.riskAnalysis.status === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
                      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {selectedPhc.riskAnalysis.status === 'red' ? t("statusRed") : selectedPhc.riskAnalysis.status === 'amber' ? t("statusAmber") : t("statusGreen")}
                    </span>
                  </div>
                </div>

                {/* KPI INDICATOR CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Doctor Attendance */}
                  <div className="bg-slate-900/50 border border-slate-900 p-3.5 rounded-xl text-center">
                    <Users className="h-4 w-4 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wide">{t("doctorAttendance")}</span>
                    <h4 className={`text-lg font-black mt-1 ${selectedPhc.doctorAttendance < 60 ? 'text-red-400' : 'text-slate-100'}`}>
                      {selectedPhc.doctorAttendance}%
                    </h4>
                  </div>
                  {/* Available Beds */}
                  <div className="bg-slate-900/50 border border-slate-900 p-3.5 rounded-xl text-center">
                    <Activity className="h-4 w-4 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wide">{t("availableBeds")}</span>
                    <h4 className={`text-lg font-black mt-1 ${selectedPhc.bedsAvailable === 0 ? 'text-red-400' : 'text-slate-100'}`}>
                      {selectedPhc.bedsAvailable} / {selectedPhc.bedsTotal}
                    </h4>
                  </div>
                  {/* Diagnostic Test kits */}
                  <div className="bg-slate-900/50 border border-slate-900 p-3.5 rounded-xl text-center">
                    <FileCheck className="h-4 w-4 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wide">{t("testKits")}</span>
                    <h4 className={`text-lg font-black mt-1 ${selectedPhc.testKitsAvailable < selectedPhc.testKitsMinRequired ? 'text-amber-400' : 'text-slate-100'}`}>
                      {selectedPhc.testKitsAvailable}
                    </h4>
                  </div>
                  {/* Rainfall Peak */}
                  <div className="bg-slate-900/50 border border-slate-900 p-3.5 rounded-xl text-center">
                    <Droplets className="h-4 w-4 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wide">{t("maxRain")}</span>
                    <h4 className="text-lg font-black text-slate-100 mt-1">
                      {Math.max(...selectedPhc.rainfallHistory)} mm
                    </h4>
                  </div>
                </div>

                {/* 14-DAY SYMPTOM & WEATHER TREND (RECHARTS) */}
                <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-indigo-400" />
                        {t("symptomTrend")}
                      </h3>
                      <p className="text-[10px] text-indigo-300 mt-0.5">{t("correlationNotice")}</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getTimelineData()}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                        
                        {/* Symptoms */}
                        <Line type="monotone" dataKey="Fever" stroke="#f87171" strokeWidth={2.5} name={t("fever")} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Diarrhea" stroke="#fbbf24" strokeWidth={2} name={t("diarrhea")} />
                        <Line type="monotone" dataKey="Malaria" stroke="#818cf8" strokeWidth={2.5} name={t("malaria")} />
                        <Line type="monotone" dataKey="Rash" stroke="#ec4899" strokeWidth={1.5} name={t("rash")} />
                        <Line type="monotone" dataKey="Dengue" stroke="#f97316" strokeWidth={2} name="Dengue" />
                        <Line type="monotone" dataKey="Typhoid" stroke="#14b8a6" strokeWidth={1.5} name="Typhoid" />
                        <Line type="monotone" dataKey="Respiratory (ARI)" stroke="#a855f7" strokeWidth={1.5} name="Respiratory (ARI)" />
                        
                        {/* Rainfall overlays as dashed lag indicator */}
                        <Line type="monotone" dataKey="Rainfall" stroke="#38bdf8" strokeDasharray="4 4" strokeWidth={1.5} name="Rainfall (mm)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CORE DRUG STOCK PROGRESS BARS */}
                <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
                  <h3 className="text-sm font-bold text-white border-b border-slate-900 pb-2">{t("drugInventory")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {Object.keys(selectedPhc.stock).map((drug) => {
                      const s = selectedPhc.stock[drug];
                      const pct = Math.min(100, Math.round((s.current / s.minRequired) * 100));
                      const isLow = s.current < s.minRequired;

                      return (
                        <div key={drug} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-200">{drug}</span>
                            <span className={`font-mono ${isLow ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                              {s.current} / {s.minRequired} {s.unit}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                s.current === 0 ? 'w-0' : isLow ? 'bg-red-500' : pct > 100 ? 'bg-indigo-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* EPIDEMIC FORECAST HORIZON & GEMINI EXPLANATION LAYER */}
                <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-white border-b border-slate-900 pb-2">
                    {t("forecastsHeader")}
                  </h3>

                  <div className="space-y-3">
                    {selectedPhc.forecasts.map((f) => {
                      const isSpike = f.currentTrend === "rising";
                      const explanation = explanationTexts[f.symptom];

                      return (
                        <div key={f.symptom} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200 font-mono">
                                  {t(f.symptom.toLowerCase()) || f.symptom}
                                </span>
                                <span className={`text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded ${
                                  isSpike ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}>
                                  {isSpike ? "EPIDEMIC SPIKE FORECAST" : "STABLE"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium mt-1">
                                {f.reasoning}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-slate-300 font-mono block">
                                Horizon: {f.horizonDays}
                              </span>
                              <span className="text-[10px] text-indigo-400 block mt-0.5 font-bold">
                                Projected cases: {f.projectedCount}
                              </span>
                            </div>
                          </div>

                          {/* Gemini Clinical Explanation Layer button */}
                          <div className="pt-2 border-t border-slate-900 flex flex-col gap-2">
                            {explanation ? (
                              <div className="p-2 bg-indigo-500/5 text-indigo-200 text-xs border border-indigo-500/15 rounded-lg flex items-start gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                                <div className="italic leading-relaxed">
                                  "{explanation}"
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleRequestExplanation(f.symptom, f.riskScore, selectedPhc.symptomHistory[f.symptom][13])}
                                disabled={explainingSymptom !== null}
                                className="w-fit flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-indigo-500/20 cursor-pointer transition-colors disabled:opacity-50"
                              >
                                {explainingSymptom === f.symptom ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Querying Gemini Medical Reasoner...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {t("explainBtn")}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </>
                )}

                {activeTab === "digitization" && (
                  <>
                    {/* REGISTER PHOTO DIGITIZATION MODULE (GEMINI MULTIMODAL OCR) */}
                <div id="ocr-digitization-section" className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-indigo-400" />
                      {t("digitizerTitle")}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{t("digitizerDesc")}</p>
                  </div>

                  {/* Drag & Drop zone / Upload UI (Always accessible unless successfully completed, or re-upload enabled) */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      dragActive ? "border-indigo-500 bg-indigo-500/5" : "border-slate-800 bg-slate-950/30 hover:border-slate-700"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <span className="text-xs font-bold text-slate-300 block">{t("uploadPlaceholder")}</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Supports PNG, JPG, WebP, PDF (Max 10MB)</span>
                  </div>

                  {/* Dynamic interactive quick samples */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive Quick Simulators:</span>
                    <button
                      onClick={() => triggerDigitization(SAMPLE_REGISTERS.monsoon.base64)}
                      className="text-[10px] font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {t("uploadSampleBtn")}
                    </button>
                    <button
                      onClick={() => triggerDigitization(SAMPLE_REGISTERS.summer.base64)}
                      className="text-[10px] font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {t("uploadSampleBtn2")}
                    </button>
                  </div>

                  {/* Uploading or Processing state with visible loading indicator */}
                  {(ocrState === 'uploading' || ocrState === 'processing') && (
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-3 text-xs text-indigo-300 font-mono">
                      <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                      <span>{ocrState === 'uploading' ? "Reading and validating file..." : (t("digitizingState") || "Gemini Multimodal OCR digitizing and parsing strictly structured JSON...")}</span>
                    </div>
                  )}

                  {/* Error state with user-facing message and retry option */}
                  {ocrState === 'error' && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>OCR Digitization Failed</span>
                      </div>
                      <p className="text-xs text-rose-300 font-mono">{ocrErrorMessage || "An unexpected error occurred during OCR extraction."}</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                      >
                        Try Re-uploading / Retry
                      </button>
                    </div>
                  )}

                  {/* Image Preview if available */}
                  {selectedImagePreview && (
                    <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-900">
                      <img src={selectedImagePreview} alt="Uploaded Register Preview" className="h-12 w-12 object-cover rounded-lg border border-slate-800" />
                      <div className="flex-1 truncate">
                        <span className="text-xs font-bold text-slate-300 block truncate">Uploaded Register Document</span>
                        <span className="text-[10px] font-mono text-slate-500 block">Ready for multimodal medical scribe extraction</span>
                      </div>
                      <button
                        onClick={() => { setSelectedImagePreview(null); setOcrState('idle'); }}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Extracted digitized JSON list ledger (Editable for medical accuracy) */}
                  {ocrState === 'success' && digitizedRecords.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <FileCheck className="h-4 w-4 text-emerald-400" />
                          {t("digitizedTableTitle")} (Editable for Medical Verification)
                        </h4>
                        <span className="text-[10px] font-mono text-emerald-400">OCR Confidence: High</span>
                      </div>

                      {ocrWarning && (
                        <p className="text-[10px] bg-amber-500/5 border border-amber-500/10 p-2 rounded text-amber-400">
                          {ocrWarning}
                        </p>
                      )}

                      <div className="overflow-x-auto border border-slate-900 rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 font-mono text-slate-400">
                            <tr>
                              <th className="p-2 border-b border-slate-900">Date</th>
                              <th className="p-2 border-b border-slate-900">Symptom</th>
                              <th className="p-2 border-b border-slate-900">Cases</th>
                              <th className="p-2 border-b border-slate-900">Rx Dispensed</th>
                              <th className="p-2 border-b border-slate-900 text-right">Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 font-mono">
                            {editableRecords.map((rec, i) => (
                              <tr key={i} className="hover:bg-slate-900/30">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={rec.date}
                                    onChange={(e) => handleRecordChange(i, 'date', e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white w-28"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={rec.symptom}
                                    onChange={(e) => handleRecordChange(i, 'symptom', e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-indigo-400 font-bold w-28"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={rec.footfallCount}
                                    onChange={(e) => handleRecordChange(i, 'footfallCount', parseInt(e.target.value) || 0)}
                                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white font-bold w-16"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={rec.drugDispensed}
                                    onChange={(e) => handleRecordChange(i, 'drugDispensed', e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-300 w-36"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    value={rec.quantity}
                                    onChange={(e) => handleRecordChange(i, 'quantity', parseInt(e.target.value) || 0)}
                                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-300 w-16 text-right"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={commitDigitizedLedger}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          {t("commitLedgerBtn")}
                        </button>
                        <button
                          onClick={() => { setOcrState('idle'); setDigitizedRecords([]); setEditableRecords([]); setSelectedImagePreview(null); }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                </>
                )}

                {activeTab === "redistribution" && (
                  <>
                    {/* SMART RESOURCE REDISTRIBUTION RECOMMENDATIONS */}
                <div id="redistribution-section" className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-indigo-400" />
                      {t("redistributionTitle")}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{t("redistributionDesc")}</p>
                  </div>

                  {/* Deficit Detector Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-900">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Select Stock Deficiency</label>
                      <select
                        id="defect-drug-select"
                        value={selectedDrug}
                        onChange={(e) => {
                          setSelectedDrug(e.target.value);
                          setSourcePhcId("");
                          setDraftText("");
                          setRedistributeSuccess("");
                        }}
                        className="w-full bg-slate-900 text-xs border border-slate-800 rounded-lg p-2 focus:outline-none"
                      >
                        <option value="">-- Choose deficient medicine --</option>
                        {Object.keys(selectedPhc.stock).map((drug) => (
                          <option key={drug} value={drug}>
                            {drug} (Current: {selectedPhc.stock[drug].current})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedDrug && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">{t("transferSource")} (&lt; 500km Range)</label>
                        <select
                          id="surplus-source-select"
                          value={sourcePhcId}
                          onChange={(e) => {
                            const newSourceId = e.target.value;
                            setSourcePhcId(newSourceId);
                            if (newSourceId) {
                              const recommended = getRecommendedTransferQty(newSourceId);
                              setTransferQty(recommended);
                            }
                            setDraftText("");
                          }}
                          className="w-full bg-slate-900 text-xs border border-slate-800 rounded-lg p-2 focus:outline-none"
                        >
                          <option value="">-- Choose verified surplus facility (&lt;500km) --</option>
                          {findSurplusFacilities(selectedDrug).map((p) => {
                            const dist = calculateDistanceKm(selectedPhc, p);
                            const surplusAmt = p.stock[selectedDrug].current - p.stock[selectedDrug].minRequired;
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} — {dist} km away (Surplus: +{surplusAmt})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Transfer input controls */}
                  {sourcePhcId && selectedDrug && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="w-1/2 space-y-1.5">
                          <label className="text-[10px] font-mono text-slate-400 uppercase">{t("transferQty")}</label>
                          <input
                            type="number"
                            value={transferQty}
                            onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value, 10)))}
                            className="w-full bg-slate-950 text-xs font-mono font-bold border border-slate-800 rounded-lg p-2 focus:outline-none"
                          />
                          <div className="text-[9px] text-indigo-300 font-mono flex items-center gap-1 mt-0.5">
                            <Sparkles className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                            <span>AI Analyzed based on future forecast & surplus stock.</span>
                          </div>
                        </div>
                        <div className="w-1/2 pt-5">
                          <button
                            onClick={handleDraftOrder}
                            disabled={drafting}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {drafting ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Drafting...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5" />
                                {t("draftOrderBtn")}
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Gemini drafted transfer paper sheet */}
                      {draftText && (
                        <div className="space-y-3">
                          <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/20 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto shadow-inner shadow-black relative">
                            <span className="absolute top-2 right-2 text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase">
                              Gemini Drafted GO
                            </span>
                            {draftText}
                          </div>

                          <button
                            onClick={handleApproveRedistribution}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <FileCheck className="h-4 w-4" />
                            {t("approveOrderBtn")}
                          </button>
                        </div>
                      )}

                      {redistributeSuccess && (
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 rounded-xl flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="font-bold">{redistributeSuccess}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TRANSFER LEDGER COMPLETED HISTORY */}
                <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-slate-400" />
                    {t("approvedLogs")}
                  </h3>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transferLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-200">
                            {log.sourcePhcName} &rarr; {log.targetPhcName}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            ID: {log.id} • {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-indigo-400 font-mono">
                            +{log.quantity} {log.drugName}
                          </span>
                          <span className="block text-[9px] text-emerald-400 font-black uppercase mt-0.5 font-mono">
                            ✓ APPROVED & SENT
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

              </div>
            )}
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-8 px-6 mt-12 bg-slate-950/40 text-slate-500 text-center text-xs">
        <p>&copy; 2026 Uttar Pradesh State Health Command. All telemetry synced with central state health warehouse.</p>
        <p className="mt-1">Built with high-contrast slate paired design for rapid administrative epidemic containment.</p>
      </footer>
    </div>
  );
}