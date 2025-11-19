import { useState } from "react";
import api from "../config/api";
import ResultCard from "../components/ResultCard";
import UploadCard from "../components/UploadCard";

export default function UsePage() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { caption, image, metadata }
  const [error, setError] = useState(null);

  // Caption options state with better defaults
  const [options, setOptions] = useState({
    language: "English",
    mood: "casual",
    tone: "engaging",
    emojis: true,
    hashtags: true,
  });

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    // Reset previous state
    setResult(null);
    setError(null);
    setFile(f);
  };

  const uploadAndCaption = async () => {
    if (!file) {
      setError("Please select an image file first.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("image", file);

      // Attach options to FormData
      Object.entries(options).forEach(([key, value]) => {
        fd.append(key, value);
      });

      console.log("Uploading image with options:", options);

      const { data } = await api.post("/api", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000, // 30 second timeout
      });

      // Validate response
      if (!data || !data.caption) {
        throw new Error("Invalid response from server");
      }

      console.log("Caption generated successfully:", data);

      // Clear file after successful upload
      setFile(null);
      setResult(data);

    } catch (err) {
      console.error("Error uploading/captioning:", err);

      // Enhanced error handling
      let errorMessage = "Failed to generate caption.";
      let errorDetails = null;

      if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
        errorMessage = "Request timed out.";
        errorDetails = "The server took too long to respond. Please try again.";
      } else if (err.response) {
        // Server responded with error
        const status = err.response.status;
        const serverError = err.response.data?.error || err.response.data?.message;
        const serverDetails = err.response.data?.details;

        if (status === 400) {
          errorMessage = "Invalid request.";
          errorDetails = serverError || "Please check your image and try again.";
        } else if (status === 413) {
          errorMessage = "File too large.";
          errorDetails = "Please upload a smaller image (max 10MB).";
        } else if (status === 500) {
          errorMessage = "Server error.";
          errorDetails = serverError || "Please try again later.";
        } else if (status === 503) {
          errorMessage = "Service unavailable.";
          errorDetails = "The AI service is temporarily unavailable. Please try again later.";
        } else {
          errorMessage = serverError || errorMessage;
          errorDetails = serverDetails;
        }
      } else if (err.request) {
        // Request made but no response
        errorMessage = "No response from server.";
        errorDetails = "Please check your internet connection and try again.";
      } else {
        // Something else happened
        errorMessage = err.message || errorMessage;
      }

      setError(errorDetails ? `${errorMessage} ${errorDetails}` : errorMessage);

    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Amazing Captions
          </h1>
          <p className="text-lg text-gray-600">
            Upload an image and let{" "}
            <span className="font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              CaptionAir AI
            </span>{" "}
            generate the perfect caption
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload card */}
          <UploadCard
            busy={busy}
            error={error}
            uploadAndCaption={uploadAndCaption}
            file={file}
            onFile={onFile}
            options={options}
            setOptions={setOptions}
          />

          {/* Result card */}
          <ResultCard result={result} />
        </div>

        {/* Tips Section */}
        {!result && !busy && (
          <div className="mt-8 bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Tips for Best Results
            </h3>
            <ul className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Use high-quality, well-lit images
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Experiment with different moods and tones
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Try different languages for diverse audiences
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Add emojis and hashtags for social media
              </li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
