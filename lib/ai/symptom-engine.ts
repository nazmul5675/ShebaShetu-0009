export interface SuggestionResult {
  department: string;
  confidence: number;
  warning?: string;
  reason?: string;
  disclaimer: string;
}

const RULES = [
  {
    keywords: ['chest pain', 'heart', 'breathing', 'palpitation', 'dizzy', 'pressure', 'high bp', 'cardio'],
    department: 'Cardiology',
    reason: 'Your symptoms suggest potential cardiovascular issues that require specialist evaluation.',
    warning: 'If you are experiencing severe chest pain, shortness of breath, or numbness, please seek emergency care (ER) immediately.'
  },
  {
    keywords: ['rash', 'skin', 'itching', 'spot', 'allergy', 'acne', 'burn', 'eczema', 'dermatology'],
    department: 'Dermatology',
    reason: 'Our dermatologists specialize in skin, hair, and nail conditions related to your description.'
  },
  {
    keywords: ['fever', 'cough', 'cold', 'flu', 'weakness', 'body ache', 'headache', 'infection', 'general'],
    department: 'General Medicine',
    reason: 'A general practitioner can provide the first line of diagnosis and treatment for these systemic symptoms.'
  },
  {
    keywords: ['pregnancy', 'period', 'menstrual', 'gyne', 'obstetrics', 'women health', 'pcos'],
    department: 'Gynecology',
    reason: 'These symptoms are best addressed by our specialized women\'s health and obstetrics department.'
  },
  {
    keywords: ['child', 'baby', 'infant', 'pediatric', 'vaccination', 'kid', 'growth'],
    department: 'Pediatrics',
    reason: 'Our pediatricians are experts in child development and pediatric illnesses.'
  },
  {
    keywords: ['eye', 'vision', 'blurred', 'redness', 'ophthalmology', 'glasses', 'sight'],
    department: 'Ophthalmology',
    reason: 'An eye specialist is needed to evaluate your vision and ocular health.'
  },
  {
    keywords: ['tooth', 'gum', 'dental', 'braces', 'extraction', 'cavity', 'oral'],
    department: 'Dental',
    reason: 'For oral and dental concerns, our specialized dental clinic is the appropriate choice.'
  },
  {
    keywords: ['bone', 'joint', 'fracture', 'knee', 'back pain', 'muscle', 'sprain', 'ortho'],
    department: 'Orthopedics',
    reason: 'Musculoskeletal concerns should be evaluated by our orthopedic surgeons and therapists.'
  },
  {
    keywords: ['ear', 'nose', 'throat', 'sinus', 'ent', 'hearing', 'swallowing'],
    department: 'ENT',
    reason: 'These symptoms relate to the ear, nose, or throat, requiring an ENT specialist.'
  },
  {
    keywords: ['brain', 'nerve', 'seizure', 'paralysis', 'neurology', 'memory', 'stroke'],
    department: 'Neurology',
    reason: 'Neurological symptoms require advanced diagnostic tools and specialized expertise.'
  },
  {
    keywords: ['stomach', 'digestion', 'acid', 'bloating', 'gas', 'constipation', 'diarrhea', 'gastro'],
    department: 'Gastroenterology',
    reason: 'Digestive and gastric issues are best managed by our gastroenterology specialists.'
  },
  {
    keywords: ['kidney', 'urine', 'bladder', 'urology', 'prostate', 'burning'],
    department: 'Urology',
    reason: 'Urological and renal concerns require specific evaluation from our urology department.'
  }
];

const DISCLAIMER = "This tool uses pattern matching to suggest a department based on your input. It is NOT a medical diagnosis and should NOT be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified physician.";

export function analyzeSymptoms(symptoms: string): SuggestionResult {
  const text = symptoms.toLowerCase().trim();

  if (text.length < 5) {
    return {
      department: 'General Medicine',
      confidence: 0.1,
      reason: 'Please provide more details for a better suggestion.',
      disclaimer: DISCLAIMER,
    };
  }

  // Find the best match by counting keyword hits
  let bestMatch = null;
  let maxHits = 0;

  for (const rule of RULES) {
    const hits = rule.keywords.reduce((count, kw) => count + (text.includes(kw) ? 1 : 0), 0);
    if (hits > maxHits) {
      maxHits = hits;
      bestMatch = rule;
    }
  }

  return {
    department: bestMatch?.department ?? 'General Medicine',
    confidence: bestMatch ? Math.min(0.9, 0.4 + (maxHits * 0.1)) : 0.4,
    reason: bestMatch?.reason ?? 'Your symptoms appear general in nature. A general practitioner is the best place to start.',
    warning: bestMatch?.warning,
    disclaimer: DISCLAIMER,
  };
}

