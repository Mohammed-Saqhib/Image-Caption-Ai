import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ResultCard = ({ result }) => {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [toast, setToast] = useState(null);

  // Toast notification system
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Enhanced speech synthesis with error handling
  const speakCaption = (caption) => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Clean caption for speech (remove emojis and hashtags)
      const cleanCaption = caption
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Remove emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Remove misc symbols
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Remove transport symbols
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Remove flags
        .replace(/[\u{2600}-\u{26FF}]/gu, '')  // Remove misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')  // Remove dingbats
        .replace(/#\w+/g, '')                   // Remove hashtags
        .trim();

      if (!cleanCaption) {
        showToast('No text to speak', 'warning');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanCaption);
      
      // Configure speech
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setSpeaking(true);
      };

      utterance.onend = () => {
        setSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setSpeaking(false);
        showToast('Speech playback failed', 'error');
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      setSpeaking(false);
      showToast('Speech not supported', 'error');
    }
  };

  // Stop speech
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Enhanced copy function with better feedback
  const handleCopy = async () => {
    if (result?.caption) {
      try {
        await navigator.clipboard.writeText(result.caption);
        setCopied(true);
        showToast('Caption copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy caption', 'error');
      }
    }
  };

  // Download caption as text file
  const handleDownload = () => {
    if (result?.caption) {
      try {
        const blob = new Blob([result.caption], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `caption_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Caption downloaded!', 'success');
      } catch (error) {
        console.error('Download failed:', error);
        showToast('Failed to download caption', 'error');
      }
    }
  };

  // Auto-speak on new result (optional - can be disabled)
  useEffect(() => {
    if (result?.caption) {
      // Uncomment to enable auto-speak
      // speakCaption(result.caption);
    }
    
    // Cleanup on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [result]);

  return (
    <div className="relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-0 left-0 right-0 z-50 flex items-center justify-center`}
          >
            <div className={`rounded-lg px-4 py-2 shadow-lg ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              'bg-yellow-500'
            } text-white font-medium`}>
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="rounded-2xl border bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-lg">Result</h3>
          {result && (
            <span className="text-xs text-gray-500">
              {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>

        {!result ? (
          <div className="text-sm text-gray-600 text-center py-8">
            <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-medium">No caption yet</p>
            <p className="text-xs mt-1">Upload an image to generate a caption</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Caption with enhanced styling */}
            <motion.div
              className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-gray-800 leading-relaxed mb-3 whitespace-pre-wrap">
                {result.caption}
              </p>
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center text-xs bg-white hover:bg-gray-100 border border-gray-300 px-3 py-1.5 rounded-md transition-all transform hover:scale-105 active:scale-95"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>

                <button
                  onClick={speaking ? stopSpeech : () => speakCaption(result.caption)}
                  className={`flex items-center text-xs border px-3 py-1.5 rounded-md transition-all transform hover:scale-105 active:scale-95 ${
                    speaking 
                      ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
                      : 'bg-white hover:bg-gray-100 border-gray-300'
                  }`}
                  title={speaking ? 'Stop speech' : 'Read aloud'}
                >
                  {speaking ? (
                    <>
                      <svg className="w-4 h-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Stop
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      Speak
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center text-xs bg-white hover:bg-gray-100 border border-gray-300 px-3 py-1.5 rounded-md transition-all transform hover:scale-105 active:scale-95"
                  title="Download as text file"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </motion.div>

            {/* Image with enhanced animation */}
            <motion.figure
              className="rounded-xl border border-gray-200 bg-gray-50 p-3 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <img
                src={result.image}
                alt="Uploaded"
                className="w-full max-h-[360px] object-contain rounded-lg"
                loading="lazy"
              />
            </motion.figure>

            {/* Metadata (if available) */}
            {result.metadata && (
              <motion.div
                className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex justify-between">
                  <span>Language:</span>
                  <span className="font-medium">{result.metadata.language}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mood:</span>
                  <span className="font-medium capitalize">{result.metadata.mood}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tone:</span>
                  <span className="font-medium capitalize">{result.metadata.tone}</span>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default ResultCard;
