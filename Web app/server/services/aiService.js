const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const dotenv = require('dotenv');

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_API_KEY";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "YOUR_API_KEY";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

exports.generateInsights = async (data) => {
  try {
    if (GEMINI_API_KEY === "YOUR_API_KEY" && OPENAI_API_KEY === "YOUR_API_KEY") {
      return "AI Insights: Please provide a valid API key (GEMINI_API_KEY or OPENAI_API_KEY) to get real analysis.";
    }

    if (GEMINI_API_KEY !== "YOUR_API_KEY") {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});
        const prompt = `Analyze the following pharmacy data and provide 2 brief, actionable insights or alerts: ${JSON.stringify(data)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("✓ Gemini API succeeded");
        return text;
      } catch (error) {
        console.warn("Gemini API failed, falling back to OpenAI:", error.message);
      }
    }

    if (OPENAI_API_KEY !== "YOUR_API_KEY") {
      console.log("Using OpenAI as fallback...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Analyze the following pharmacy data and provide 2 brief, actionable insights or alerts: ${JSON.stringify(data)}`
          }
        ]
      });
      console.log("✓ OpenAI API succeeded (fallback from Gemini)");
      return response.choices[0].message.content;
    }

    throw new Error("No valid API key configured");
  } catch (error) {
    console.error("AI Service Error:", error.message);
    return "AI Service Unavailable (Check API Keys)";
  }
};

exports.analyzePrescription = async (fileBuffer, mimeType) => {
  try {
    if (GEMINI_API_KEY === "YOUR_API_KEY" && OPENAI_API_KEY === "YOUR_API_KEY") {
      throw new Error("Invalid API Keys - Configure GEMINI_API_KEY or OPENAI_API_KEY");
    }

    const prompt = `
      Analyze this medical prescription image. Extract the following details in strict JSON format:
      {
        "medications": [
          { "name": "Medicine Name", "dosage": "e.g. 500mg", "frequency": "e.g. Twice a day" }
        ],
        "reminders": [
          { "message": "Take Medicine X", "time": "HH:MM" }
        ]
      }
      
      IMPORTANT:
      - Infer reminders from the frequency if possible. 
      - For "Twice a day", generate two reminders (e.g., 09:00 and 21:00).
      - For "Once a day", generate one reminder (e.g., 09:00).
      - For "Three times a day", generate three (09:00, 14:00, 20:00).
      - If details are unclear, return empty arrays. 
      - Do not use markdown code blocks.
    `;

    // Try Gemini first
    if (GEMINI_API_KEY !== "YOUR_API_KEY") {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const imagePart = {
          inlineData: {
            data: fileBuffer.toString("base64"),
            mimeType
          },
        };

        let result;
        let retries = 3;
        let lastError;
        
        while (retries > 0) {
          try {
            result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();
            
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            console.log("✓ Gemini API succeeded");
            return JSON.parse(jsonStr);
          } catch (error) {
            lastError = error;
            
            if ((error.status === 503 || error.status === 429) && retries > 1) {
              const delay = (4 - retries) * 2000;
              console.warn(`Gemini overloaded. Retrying in ${delay}ms... (${retries - 1} retries left)`);
              await new Promise(resolve => setTimeout(resolve, delay));
              retries--;
            } else {
              throw error;
            }
          }
        }
        
        throw lastError;
      } catch (error) {
        console.warn("Gemini API failed, falling back to OpenAI:", error.message);
      }
    }

    if (OPENAI_API_KEY !== "YOUR_API_KEY") {
      const base64Image = fileBuffer.toString("base64");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                }
              }
            ]
          }
        ]
      });

      const text = response.choices[0].message.content;
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      console.log("✓ OpenAI API succeeded (fallback from Gemini)");
      return JSON.parse(jsonStr);
    }

    throw new Error("No valid API key configured for prescription analysis");
  } catch (error) {
    console.error("AI Analysis Error:", error.message);
    throw new Error("Failed to analyze prescription - both Gemini and OpenAI unavailable");
  }
};
