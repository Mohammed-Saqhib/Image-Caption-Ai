const { GoogleGenAI } = require("@google/genai");
const { config } = require("dotenv");

// Load environment variables
config();

// Validate API key on module load
if (!process.env.GEMINI_API_KEY) {
  console.error("CRITICAL: GEMINI_API_KEY environment variable is not set!");
}

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generate an image caption using Google's Gemini AI
 * @param {Buffer} imageData - The image buffer to caption
 * @param {Object} options - Caption generation options
 * @returns {Promise<string>} - Generated caption or error message
 */
async function generateCaption(imageData, options = {}) {
  // Input validation
  if (!imageData) {
    console.error("No image data provided to generateCaption");
    return "Error: No image data provided.";
  }

  if (!Buffer.isBuffer(imageData)) {
    console.error(
      "Expected a Buffer for image data but received:",
      typeof imageData
    );
    return "Error: Invalid image data format.";
  }

  if (imageData.length === 0) {
    console.error("Empty image buffer received");
    return "Error: Empty image file.";
  }

  // Check API key availability
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not configured");
    return "Error: AI service not configured properly.";
  }

  const base64Image = imageData.toString("base64");

  // Validate and sanitize options with defaults
  const {
    language = "English",
    mood = "casual",
    tone = "engaging",
    emojis = false,
    hashtags = false,
  } = options;

  // Validate language input
  const validLanguages = [
    "English", "Hindi", "Urdu", "Punjabi", "Bangla", 
    "Tamil", "Telugu", "Gujarati", "Marathi", "Spanish", 
    "French", "German", "Italian", "Chinese", "Japanese"
  ];
  const selectedLanguage = validLanguages.includes(language) ? language : "English";

  // Build enhanced prompt for better captions
  const userPrompt = `Generate a single, high-quality caption for this image.

REQUIREMENTS:
- Language: ${selectedLanguage}
- Mood: ${mood}
- Tone: ${tone}
- Include emojis: ${emojis ? "Yes (1-3 relevant emojis)" : "No"}
- Include hashtags: ${hashtags ? "Yes (3-5 relevant hashtags at the end)" : "No"}

IMPORTANT:
- Be descriptive and accurate
- Capture the essence of the image
- Use natural, engaging language
- If text is visible in the image, incorporate it naturally
- Keep it concise but informative (15-30 words ideal)
- Match the specified mood and tone perfectly`;

  const contents = [
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image,
      },
    },
    {
      text: userPrompt,
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: contents,
      config: {
        temperature: 0.8, // Balanced creativity
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200,
        systemInstruction: `You are an expert creative writer and image caption specialist.

CORE RESPONSIBILITIES:
1. Analyze images thoroughly and generate ONE perfect caption
2. Follow user preferences exactly (language, mood, tone, emojis, hashtags)
3. Be accurate, creative, and engaging
4. Capture the image's essence in natural language
5. If text is visible in the image, mention it contextually

CAPTION QUALITY STANDARDS:
- Clear and concise (15-30 words typically)
- Grammatically perfect in the target language
- Emotionally resonant with the specified mood
- Appropriate tone for the context
- Natural emoji placement (when requested)
- Relevant hashtags (when requested)

LANGUAGE HANDLING:
- For non-English languages, use proper script and grammar
- Maintain cultural sensitivity
- Ensure natural phrasing in the target language

DEFAULT BEHAVIOR (if preferences unclear):
- Use simple, friendly English
- Be descriptive and accurate
- No emojis or hashtags unless requested`,
      },
    });

    // Validate response
    if (!response || !response.text) {
      console.error("Empty response from Gemini API");
      return "Error: AI service returned an empty response.";
    }

    const caption = response.text.trim();

    // Quality check
    if (caption.length < 3) {
      console.error("Generated caption too short:", caption);
      return "Error: Generated caption is too short.";
    }

    if (caption.toLowerCase().includes("error") || caption.toLowerCase().includes("unable to")) {
      console.warn("Generated caption contains error message:", caption);
      return "Error: Unable to generate appropriate caption for this image.";
    }

    console.log(`Caption generated successfully (${caption.length} chars)`);
    return caption;

  } catch (error) {
    // Enhanced error handling
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
    
    console.error("Error calling Gemini API:", {
      message: errorMessage,
      status: error.response?.status,
      statusText: error.response?.statusText,
      timestamp: new Date().toISOString()
    });

    // Provide user-friendly error messages
    if (errorMessage.includes("API key")) {
      return "Error: AI service authentication failed. Please contact support.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
      return "Error: Service temporarily unavailable due to high demand. Please try again later.";
    } else if (errorMessage.includes("timeout")) {
      return "Error: Request timed out. Please try again.";
    } else if (errorMessage.includes("invalid") || errorMessage.includes("malformed")) {
      return "Error: Invalid image format. Please try a different image.";
    } else {
      return "Error: Failed to generate caption. Please try again.";
    }
  }
}

module.exports = generateCaption;
