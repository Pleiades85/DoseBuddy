import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

/**
 * Retrieves Gemini API key from environment variables
 * @throws Error if API key is not configured
 */
const getApiKey = (): string => {
  const apiKey = 
    Constants.manifest?.extra?.geminiApiKey ||
    Constants.expoConfig?.extra?.geminiApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error(
      'Gemini API key not found. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.\n' +
      'Get your API key from: https://makersuite.google.com/app/apikey'
    );
  }
  
  return apiKey;
};

// Initialize Gemini AI - will throw error if API key is missing
const API_KEY = getApiKey();
const genAI = new GoogleGenerativeAI(API_KEY);

const VISION_MODEL = 'gemini-2.5-flash';
const CHAT_MODEL = 'gemini-2.5-flash';

// Input sanitization helper to prevent prompt injection
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML/XML tags
    .replace(/[{}]/g, '') // Remove curly braces that could break JSON
    .trim()
    .slice(0, 200); // Limit length to prevent abuse
};

// Simple in-memory cache
const medicationCache = new Map<string, any>();

export const geminiService = {
  async scanMedicine(imageUri: string): Promise<any> {
    try {
      console.log('Starting medicine scan for:', imageUri);
      
      const model = genAI.getGenerativeModel({ 
        model: VISION_MODEL,
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        }
      });
      
      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      
      const prompt = `You are a medical assistant analyzing a medicine label or prescription. 
      Extract comprehensive information from the image and return ONLY valid JSON with no additional text:
      
      {
        "name": "exact medicine name as shown",
        "genericName": "generic/scientific name if different from brand name",
        "dosage": "dosage strength (e.g., 10mg, 500mg)",
        "type": "form (tablet, capsule, syrup, injection, cream, etc.)",
        "manufacturer": "manufacturer name if visible",
        "expiryDate": "expiry date if visible (format: MM/YYYY)",
        "batchNumber": "batch/lot number if visible",
        "activeIngredient": "active ingredient/generic name",
        "category": "therapeutic category (e.g., Antibiotic, Pain Reliever, Antihypertensive)",
        "description": "brief 2-3 sentence description of what this medicine is and how it works",
        "uses": [
          "primary medical use/condition treated",
          "secondary use if applicable",
          "other approved uses"
        ],
        "benefits": [
          "key benefit 1 (e.g., Fast relief from pain)",
          "key benefit 2 (e.g., Long-lasting protection)",
          "key benefit 3 (e.g., Well-tolerated by most patients)"
        ],
        "sideEffects": [
          "common side effect 1 (e.g., Mild nausea)",
          "common side effect 2 (e.g., Drowsiness)",
          "common side effect 3 (e.g., Headache)"
        ],
        "instructions": "dosage instructions if visible",
        "frequency": "how often to take (e.g., twice daily, every 8 hours)",
        "warnings": "any warnings or precautions visible",
        "links": [
          {
            "title": "Medicine Information on Drugs.com",
            "url": "https://www.drugs.com/search.php?searchterm=MEDICINE_NAME"
          },
          {
            "title": "FDA Information",
            "url": "https://www.fda.gov/drugs"
          },
          {
            "title": "MedlinePlus Drug Information",
            "url": "https://medlineplus.gov/druginfo/meds/MEDICINE_NAME.html"
          },
          {
            "title": "WebMD Medicine Details",
            "url": "https://www.webmd.com/drugs/2/search?type=drugs&query=MEDICINE_NAME"
          }
        ]
      }
      
      Rules:
      1. Replace MEDICINE_NAME in URLs with the actual medicine name (URL-encoded)
      2. If a field is not visible or unclear, set it to null or empty array
      3. Do not make up information - only provide what you can verify from the image
      4. For description, uses, benefits, and side effects, provide general medical knowledge about this medicine
      5. Benefits should focus on therapeutic advantages (pros)
      6. Side effects should list potential adverse effects (cons)
      7. Return ONLY the JSON object, no markdown or extra text
      8. If the image doesn't show medicine, return: {"error": "No medicine detected in image"}
      9. Make the description informative and patient-friendly
      10. Ensure links are properly formatted with the medicine name`;

      console.log('Sending request to Gemini API...');
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const text = result.response.text();
      console.log('Gemini response:', text);
      
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/```\n?$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/, '').replace(/```\n?$/, '');
      }
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.error('No JSON found in response:', text);
        throw new Error('Could not extract medicine information from the response');
      }

      const medicineData = JSON.parse(jsonMatch[0]);
      
      if (medicineData.error) {
        throw new Error(medicineData.error);
      }

      console.log('Successfully parsed medicine data:', medicineData);
      
      // Enhance links with proper encoding
      if (medicineData.links && medicineData.name) {
        const encodedName = encodeURIComponent(medicineData.name);
        medicineData.links = medicineData.links.map((link: any) => ({
          ...link,
          url: link.url.replace('MEDICINE_NAME', encodedName)
        }));
      }
      
      // Add default values for missing fields
      return {
        name: medicineData.name || 'Unknown Medicine',
        genericName: medicineData.genericName || null,
        dosage: medicineData.dosage || 'Not specified',
        type: medicineData.type || 'Tablet',
        manufacturer: medicineData.manufacturer || null,
        expiryDate: medicineData.expiryDate || null,
        batchNumber: medicineData.batchNumber || null,
        activeIngredient: medicineData.activeIngredient || null,
        category: medicineData.category || null,
        description: medicineData.description || 'No description available',
        uses: medicineData.uses || [],
        benefits: medicineData.benefits || [],
        sideEffects: medicineData.sideEffects || [],
        instructions: medicineData.instructions || 'Take as directed',
        frequency: medicineData.frequency || 'As prescribed',
        warnings: medicineData.warnings || null,
        links: medicineData.links || []
      };
    } catch (error: any) {
      console.error('Medicine scan error:', error);
      
      if (error.message?.includes('API key')) {
        throw new Error('API configuration error. Please contact support.');
      }
      
      if (error.message?.includes('quota')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      
      throw new Error(error.message || 'Failed to scan medicine. Please try with a clearer image.');
    }
  },

  // ============ MEDICATION INFO LOOKUP (ENHANCED) ============
  async getMedicationInfo(medicineName: string): Promise<any> {
    try {
      // Sanitize input to prevent prompt injection
      const sanitizedName = sanitizeInput(medicineName);
      
      if (!sanitizedName) {
        throw new Error('Invalid medication name provided');
      }

      // Check cache first
      const cacheKey = sanitizedName.toLowerCase();
      if (medicationCache.has(cacheKey)) {
        console.log('Returning cached medication info for:', sanitizedName);
        return medicationCache.get(cacheKey);
      }
      
      console.log('Looking up medication info for:', sanitizedName);
      
      const model = genAI.getGenerativeModel({ 
        model: CHAT_MODEL,
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      });
      
      const prompt = `Provide accurate, detailed information about the medication "${sanitizedName}". 
      Return ONLY a JSON object with the following structure (no markdown or extra text):
      
      {
        "name": "${sanitizedName}",
        "genericName": "generic name if different from brand name",
        "dosage": "common dosage strength",
        "type": "form (tablet, capsule, syrup, etc.)",
        "category": "therapeutic category",
        "description": "comprehensive 2-3 sentence description",
        "uses": ["primary use", "secondary use", "other uses"],
        "benefits": [
          "Fast-acting relief",
          "Long-lasting effectiveness",
          "Well-tolerated by most patients"
        ],
        "sideEffects": [
          "Mild nausea",
          "Headache",
          "Drowsiness"
        ],
        "commonSideEffects": ["side effect 1", "side effect 2"],
        "seriousSideEffects": ["serious side effect if any"],
        "interactions": ["interacts with X", "avoid with condition Y"],
        "precautions": ["precaution 1", "precaution 2"],
        "contraindications": ["condition where drug should not be used"],
        "storageInstructions": "how to store the medication",
        "missedDoseInstructions": "what to do if a dose is missed",
        "overdoseWarning": "overdose symptoms and actions",
        "manufacturer": "common manufacturer if known",
        "activeIngredient": "active ingredient",
        "links": [
          {
            "title": "Drugs.com Information",
            "url": "https://www.drugs.com/search.php?searchterm=${encodeURIComponent(sanitizedName)}"
          },
          {
            "title": "MedlinePlus Details",
            "url": "https://medlineplus.gov/druginfo/meds/${sanitizedName.toLowerCase().replace(/\s+/g, '')}.html"
          }
        ]
      }
      
      If the medication is not recognized or information is limited, return:
      {"error": "Medication information not available", "name": "${sanitizedName}"}
      
      Provide only factual, verified medical information. Be comprehensive but accurate.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      let cleanedText = text.trim();
      if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/```\n?$/, '');
      }
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Could not retrieve medication information');
      }

      const medInfo = JSON.parse(jsonMatch[0]);
      
      if (medInfo.error) {
        console.log('Medication not found:', sanitizedName);
        throw new Error(medInfo.error);
      }

      console.log('Medication info retrieved successfully');
      
      // Add default values if missing
      const finalResult = {
        ...medInfo,
        uses: medInfo.uses || [],
        benefits: medInfo.benefits || [],
        sideEffects: medInfo.sideEffects || [],
        links: medInfo.links || []
      };

      // Store in cache (limit size to 50 items to prevent memory issues)
      if (medicationCache.size >= 50) {
        const firstKey = medicationCache.keys().next().value;
        medicationCache.delete(firstKey);
      }
      medicationCache.set(cacheKey, finalResult);

      return finalResult;
    } catch (error: any) {
      console.error('Medication info error:', error);
      throw new Error(`Unable to find information for ${medicineName}. Please check the spelling or try a different name.`);
    }
  },

  // ============ MEDICATION PRICING ============
  async getMedicationPrices(medications: Array<{name: string, dosage: string}>): Promise<any[]> {
    try {
      console.log('Getting prices for medications:', medications);
      
      const model = genAI.getGenerativeModel({ 
        model: CHAT_MODEL,
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      });
      
      const medicationList = medications.map(m => `${m.name} ${m.dosage}`).join(', ');
      
      const prompt = `Provide estimated retail prices in CAD for these medications in North America: ${medicationList}
      
      Return ONLY a JSON array with this exact format (no markdown):
      [
        {
          "name": "medication name",
          "dosage": "dosage strength",
          "estimatedPrice": 25.99,
          "priceRange": "$20-$30",
          "priceNote": "Price without insurance for a typical prescription quantity"
        }
      ]
      
      Rules:
      1. Provide realistic market prices based on typical pharmacy pricing
      2. Consider common prescription quantities (e.g., 30-day supply)
      3. Prices should reflect retail costs without insurance
      4. If exact price is uncertain, provide a reasonable estimate with a range
      5. Order should match the input medication list
      6. Return only the JSON array, no extra text`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      let cleanedText = text.trim();
      if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/```\n?$/, '');
      }
      
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        console.log('Could not parse pricing response, using defaults');
        return medications.map(m => ({
          name: m.name,
          dosage: m.dosage,
          estimatedPrice: 15.99,
          priceRange: "$10-$25",
          priceNote: "Estimated price"
        }));
      }

      const prices = JSON.parse(jsonMatch[0]);
      console.log('Medication prices retrieved successfully');
      
      return prices;
    } catch (error: any) {
      console.error('Pricing error:', error);
      // Return default prices on error
      return medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        estimatedPrice: 15.99,
        priceRange: "$10-$25",
        priceNote: "Estimated price"
      }));
    }
  },

  // ============ HEALTH ASSISTANT (ENHANCED) ============
  async chat(message: string, conversationHistory: any[] = [], userMedications: any[] = [], userProfile: any = null): Promise<string> {
    try {
      // Sanitize user message to prevent prompt injection
      const sanitizedMessage = message
        .replace(/[<>]/g, '')
        .replace(/[{}]/g, '')
        .trim()
        .slice(0, 500); // Allow longer messages for better context
      
      if (!sanitizedMessage) {
        throw new Error('Invalid message');
      }
      
      console.log('Chat request:', { message: sanitizedMessage, medicationCount: userMedications.length });
      
      const model = genAI.getGenerativeModel({ 
        model: CHAT_MODEL,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });
      
      // Build rich patient context
      let patientContext = '';
      
      if (userMedications.length > 0) {
        patientContext += `\n\n📋 PATIENT'S CURRENT MEDICATIONS:\n`;
        patientContext += userMedications.map(m => {
          let line = `- ${m.name} ${m.dosage || ''}`;
          if (m.frequency) line += ` (${m.frequency})`;
          if (m.duration) line += ` — Course: ${m.duration}`;
          if (m.purpose || m.reason) line += ` — For: ${m.purpose || m.reason}`;
          return line;
        }).join('\n');
      } else {
        patientContext += '\n\nPatient has no medications currently listed.';
      }

      if (userProfile) {
        if (userProfile.medicalSummary?.allergies?.length > 0) {
          patientContext += `\n\n⚠️ ALLERGIES: ${userProfile.medicalSummary.allergies.join(', ')}`;
        }
        if (userProfile.medicalSummary?.chronicConditions?.length > 0) {
          patientContext += `\n📋 CONDITIONS: ${userProfile.medicalSummary.chronicConditions.join(', ')}`;
        }
        if (userProfile.medicalSummary?.bloodType) {
          patientContext += `\n🩸 Blood Type: ${userProfile.medicalSummary.bloodType}`;
        }
        if (userProfile.personalInfo?.dateOfBirth) {
          patientContext += `\n📅 DOB: ${userProfile.personalInfo.dateOfBirth}`;
        }
        if (userProfile.insurance?.provider) {
          patientContext += `\n🏥 Insurance: ${userProfile.insurance.provider} (Plan: ${userProfile.insurance.planType || 'Unknown'})`;
        }
      }

      const systemPrompt = `You are DoseBuddy, a warm, professional healthcare assistant built into a patient's medication management app.

PATIENT PROFILE:${patientContext}

YOUR CAPABILITIES:
- Answer medication questions (side effects, interactions, timing, food restrictions)
- Provide health tips related to the patient's conditions
- Explain medical terms in simple language
- Help with medication adherence and scheduling
- Flag potential drug interactions based on their current medications
- Provide general wellness advice

RULES:
1. Be warm, conversational, and empathetic — not robotic
2. Reference the patient's specific medications and conditions when relevant
3. Keep responses focused and concise (2-4 short paragraphs max)
4. Use emoji sparingly for friendliness (💊 ⚕️ 💡 ✅)
5. ALWAYS remind to consult their pharmacist or doctor for changes
6. If they ask about a medicine they're NOT currently taking, provide general info but note it's not in their profile
7. For drug interaction questions, check against their current medication list
8. Never diagnose or prescribe — inform and guide
9. If they seem to be in an emergency, advise calling 911 immediately

CONVERSATION:
${conversationHistory.slice(-6).map(msg => 
  `${msg.isUser ? 'Patient' : 'DoseBuddy'}: ${msg.text}`
).join('\n')}

Patient: ${sanitizedMessage}

DoseBuddy:`;

      console.log('Sending chat request to Gemini...');
      
      const result = await model.generateContent(systemPrompt);
      const response = result.response.text();
      
      console.log('Chat response received, length:', response.length);
      
      return response;
    } catch (error: any) {
      console.error('Chat error:', error);
      
      if (error.message?.includes('API key')) {
        throw new Error('Chat service is currently unavailable. Please try again later.');
      }
      
      throw new Error('Failed to get response. Please check your connection and try again.');
    }
  },

  // ============ DRUG INTERACTION CHECKER ============
  async checkInteractions(medications: string[]): Promise<any> {
    try {
      console.log('Checking interactions for:', medications);
      
      if (medications.length < 2) {
        return {
          hasInteractions: false,
          interactions: [],
          disclaimer: "Need at least 2 medications to check interactions."
        };
      }
      
      const model = genAI.getGenerativeModel({ 
        model: CHAT_MODEL,
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      });
      
      const prompt = `Analyze potential drug interactions for these medications: ${medications.join(', ')}
      
      Provide a professional analysis and return ONLY a JSON object (no markdown):
      {
        "hasInteractions": true or false,
        "interactions": [
          {
            "drugs": ["drug1", "drug2"],
            "severity": "minor|moderate|major",
            "description": "brief description of the interaction",
            "recommendation": "what the patient should do",
            "symptoms": "symptoms to watch for"
          }
        ],
        "generalPrecautions": ["general advice for taking these medications together"],
        "disclaimer": "This is general information. Always consult your healthcare provider or pharmacist."
      }
      
      Focus on clinically significant interactions only. Be accurate and helpful.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      let cleanedText = text.trim();
      if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/```\n?$/, '');
      }
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Could not analyze interactions');
      }

      const interactions = JSON.parse(jsonMatch[0]);
      console.log('Interactions checked successfully');
      
      return interactions;
    } catch (error: any) {
      console.error('Interaction check error:', error);
      throw new Error('Unable to check interactions at this time. Please consult your pharmacist.');
    }
  }
};

// Helper function to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => {
      console.error('Error converting blob to base64:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}