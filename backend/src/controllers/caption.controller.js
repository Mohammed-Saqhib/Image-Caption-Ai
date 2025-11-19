const generateCaption = require("../services/ai.service");

/**
 * Controller to handle caption generation requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createCaptionController(req, res) {
  try {
    const file = req.file;

    // Comprehensive file validation
    if (!file) {
      return res.status(400).json({ 
        error: "No image file provided.",
        details: "Please upload an image file (JPG, PNG, JPEG, GIF, WEBP)."
      });
    }

    if (!file.buffer || file.buffer.length === 0) {
      return res.status(400).json({ 
        error: "Empty or invalid image file.",
        details: "The uploaded file appears to be empty or corrupted."
      });
    }

    // Validate file size (e.g., max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: "File too large.",
        details: "Please upload an image smaller than 10MB."
      });
    }

    // Validate MIME type
    const validMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: "Invalid file type.",
        details: `Supported formats: ${validMimeTypes.join(", ")}`
      });
    }

    // Extract and validate user options
    const { language, mood, tone, emojis, hashtags } = req.body;

    // Sanitize and validate options
    const userOptions = {
      language: language || "English",
      mood: mood || "casual",
      tone: tone || "engaging",
      emojis: emojis === "true" || emojis === true,
      hashtags: hashtags === "true" || hashtags === true,
    };

    console.log(`Processing caption request:`, {
      fileSize: file.buffer.length,
      mimeType: file.mimetype,
      options: userOptions,
      timestamp: new Date().toISOString()
    });

    // Pass the raw image buffer to the service
    const caption = await generateCaption(file.buffer, userOptions);

    // Check if caption generation failed
    if (!caption || caption.startsWith("Error:") || caption.startsWith("Failed")) {
      return res.status(500).json({ 
        error: "Caption generation failed.",
        details: caption,
        suggestion: "Please try a different image or adjust your preferences."
      });
    }

    // Prepare base64 image for response
    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    // Send successful response
    res.status(201).json({
      success: true,
      caption: caption.trim(),
      image: base64Image,
      metadata: {
        language: userOptions.language,
        mood: userOptions.mood,
        tone: userOptions.tone,
        hasEmojis: userOptions.emojis,
        hasHashtags: userOptions.hashtags,
        timestamp: new Date().toISOString()
      }
    });

    console.log("Caption generated successfully");

  } catch (error) {
    console.error("Error in createCaptionController:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate error response
    if (error.name === "MulterError") {
      return res.status(400).json({ 
        error: "File upload error.",
        details: error.message
      });
    }

    res.status(500).json({ 
      error: "Internal server error.",
      details: "An unexpected error occurred while processing your request.",
      suggestion: "Please try again later or contact support if the issue persists."
    });
  }
}

module.exports = {
  createCaptionController,
};
