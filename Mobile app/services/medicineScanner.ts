// services/medicineScanner.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

const getApiKey = () => {
  const apiKey = 
  Constants.manifest?.extra?.geminiApiKey ||
  Constants.expoConfig?.extra?.geminiApiKey ||
  process.env.GEMINI_API_KEY ||
  process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('Gemini API key not found in environment variables');
    return 'YOUR_GEMINI_API_KEY_HERE';
  }
  
  return apiKey;
};

const genAI = new GoogleGenerativeAI('getApiKey()');
export const scanMedicineFromImage = async (imageUri: string) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const base64Data = await convertBlobToBase64(blob);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    const result = await model.generateContent([
      "Extract medicine name from this prescription or medicine label. Return only the medicine name:",
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const medicineName = result.response.text().trim();
    return await searchMedicineInDatabase(medicineName);
    
  } catch (error) {
    console.error('OCR Error:', error);
    return null;
  }
};

const searchMedicineInDatabase = async (medicineName: string) => {
  // Search in your 11,000 medicine dataset
  const medicinesRef = collection(db, 'medications');
  const q = query(medicinesRef, where('name', '>=', medicineName), where('name', '<=', medicineName + '\uf8ff'));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  
  // Fallback: Search in components
  const compQ = query(medicinesRef, where('composition', 'array-contains', medicineName));
  const compSnapshot = await getDocs(compQ);
  
  return compSnapshot.docs[0]?.data() || null;
};