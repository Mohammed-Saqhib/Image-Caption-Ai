import React, { useState, useEffect } from "react";

const UploadCard = ({
  uploadAndCaption,
  busy,
  error,
  file,
  onFile,
  options,
  setOptions,
}) => {
  const [fileError, setFileError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [imageSource, setImageSource] = useState("upload"); // "upload" or "sample"
  const [sampleImages, setSampleImages] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const VALID_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  // Load sample images on component mount
  useEffect(() => {
    loadSampleImages();
  }, []);

  const loadSampleImages = async () => {
    try {
      // Try to fetch sample images list
      // Note: This requires the images to be in public/samples folder
      const samplesList = [
        'sample1.jpg',
        'sample2.jpg', 
        'sample3.jpg',
        'sample4.jpg',
        'sample5.jpg'
      ];
      
      // Filter out non-existent images
      const validSamples = [];
      for (const sample of samplesList) {
        try {
          const response = await fetch(`/samples/${sample}`, { method: 'HEAD' });
          if (response.ok) {
            validSamples.push(sample);
          }
        } catch (e) {
          // Image doesn't exist, skip it
        }
      }
      
      setSampleImages(validSamples);
    } catch (error) {
      console.error('Error loading sample images:', error);
    }
  };

  const handleSampleSelect = async (sampleName) => {
    try {
      const response = await fetch(`/samples/${sampleName}`);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], sampleName, { type: blob.type });
      
      // Validate the sample file
      if (validateFile(file)) {
        setSelectedSample(sampleName);
        // Trigger the onFile callback with synthetic event
        const syntheticEvent = {
          target: {
            files: [file]
          }
        };
        onFile(syntheticEvent);
      }
    } catch (error) {
      console.error('Error loading sample:', error);
      setFileError('Failed to load sample image');
    }
  };

  const validateFile = (selectedFile) => {
    if (!selectedFile) {
      setFileError("No file selected");
      return false;
    }

    // Check file type
    if (!VALID_FILE_TYPES.includes(selectedFile.type)) {
      setFileError(`Invalid file type. Please upload: ${VALID_FILE_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')}`);
      return false;
    }

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError(`File too large. Maximum size: ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`);
      return false;
    }

    // Check if file is actually an image by trying to load it
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Image loaded successfully: ${img.width}x${img.height}`);
      };
      img.onerror = () => {
        setFileError("File appears to be corrupted or not a valid image");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(selectedFile);

    setFileError(null);
    return true;
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      onFile(e);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && validateFile(droppedFile)) {
      // Create a synthetic event to pass to onFile
      const syntheticEvent = {
        target: {
          files: [droppedFile]
        }
      };
      onFile(syntheticEvent);
    }
  };

  const handleUploadClick = () => {
    if (!file) {
      setFileError("Please select an image first");
      return;
    }
    uploadAndCaption();
  };

  return (
    <section className='rounded-2xl border bg-white shadow-sm p-5'>
      <div className='flex items-start justify-between mb-3'>
        <h3 className='font-medium text-lg'>Upload Image</h3>
        {file && (
          <span className='text-xs text-gray-500'>
            {(file.size / 1024).toFixed(1)} KB
          </span>
        )}
      </div>

      {/* Image Source Toggle */}
      <div className='flex gap-2 mb-4'>
        <button
          onClick={() => setImageSource("upload")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
            imageSource === "upload"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          disabled={busy}
        >
          📁 Upload from PC
        </button>
        <button
          onClick={() => setImageSource("sample")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
            imageSource === "sample"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          disabled={busy}
        >
          🖼️ Sample Images
        </button>
      </div>

      {imageSource === "upload" ? (
        <>
          {/* File upload with drag and drop */}
          <label 
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50 border-gray-300'
            } ${
              fileError ? 'border-red-300 bg-red-50' : ''
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className='relative w-full h-full p-2'>
                <img
                  src={URL.createObjectURL(file)}
                  alt='Selected Preview'
                  className='object-contain w-full h-full rounded-lg'
                />
                <div className='absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs shadow'>
                  ✓ Ready
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center p-4'>
                <svg className='w-12 h-12 text-gray-400 mb-2' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className='text-sm text-gray-600 font-medium'>
                  Click to upload or drag & drop
                </span>
                <span className='text-xs text-gray-500 mt-1'>
                  PNG, JPG, JPEG, GIF, WEBP (Max 10MB)
                </span>
              </div>
            )}
            <input
              type='file'
              accept='image/jpeg,image/jpg,image/png,image/gif,image/webp'
              onChange={handleFileSelect}
              className='hidden'
              disabled={busy}
            />
          </label>
        </>
      ) : (
        <>
          {/* Sample Images Grid */}
          <div className='border-2 border-dashed border-gray-300 rounded-xl p-3 max-h-64 overflow-y-auto'>
            {sampleImages.length > 0 ? (
              <div className='grid grid-cols-2 gap-2'>
                {sampleImages.map((sample, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSampleSelect(sample)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition ${
                      selectedSample === sample
                        ? 'border-blue-500 ring-2 ring-blue-300'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <img
                      src={`/samples/${sample}`}
                      alt={sample}
                      className='w-full h-24 object-cover'
                    />
                    {selectedSample === sample && (
                      <div className='absolute top-1 right-1 bg-blue-600 text-white rounded-full p-1'>
                        <svg className='w-3 h-3' fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate'>
                      {sample}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-gray-500'>
                <svg className='w-12 h-12 mx-auto mb-2 text-gray-300' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className='text-sm font-medium'>No sample images available</p>
                <p className='text-xs mt-1'>Add images to frontend/public/samples/</p>
              </div>
            )}
          </div>
          
          {/* Show selected sample preview if exists */}
          {file && selectedSample && (
            <div className='mt-3 border-2 border-blue-200 rounded-lg p-2 bg-blue-50'>
              <p className='text-xs text-blue-800 font-medium mb-1'>Selected Sample:</p>
              <img
                src={URL.createObjectURL(file)}
                alt='Selected sample preview'
                className='w-full h-32 object-contain rounded'
              />
            </div>
          )}
        </>
      )}

      {/* File error display */}
      {fileError && (
        <div className='mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start'>
          <svg className='w-5 h-5 mr-2 flex-shrink-0' fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {fileError}
        </div>
      )}

      {/* Options */}
      <div className='mt-4 space-y-3'>
        {/* Language */}
        <div>
          <label className='text-sm font-medium block mb-1'>Language</label>
          <select
            value={options.language}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, language: e.target.value }))
            }
            className='w-full rounded-lg border border-gray-300 px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
            disabled={busy}
          >
            <option value='English'>English</option>
            <option value='Hindi'>Hindi</option>
            <option value='Urdu'>Urdu</option>
            <option value='Punjabi'>Punjabi</option>
            <option value='Bangla'>Bangla</option>
            <option value='Tamil'>Tamil</option>
            <option value='Telugu'>Telugu</option>
            <option value='Gujarati'>Gujarati</option>
            <option value='Marathi'>Marathi</option>
          </select>
        </div>

        {/* Mood */}
        <div>
          <label className='text-sm font-medium block mb-1'>Mood</label>
          <select
            value={options.mood}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, mood: e.target.value }))
            }
            className='w-full rounded-lg border border-gray-300 px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
            disabled={busy}
          >
            <option value='casual'>Casual</option>
            <option value='sarcastic'>Sarcastic</option>
            <option value='romantic'>Romantic</option>
            <option value='inspirational'>Inspirational</option>
            <option value='trending'>Trending</option>
            <option value='emotional'>Emotional</option>
            <option value='aesthetic'>Aesthetic</option>
            <option value='witty'>Witty</option>
            <option value='storytelling'>Storytelling</option>
            <option value='informative'>Informative</option>
          </select>
        </div>

        {/* Tone */}
        <div>
          <label className='text-sm font-medium block mb-1'>Tone</label>
          <select
            value={options.tone}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, tone: e.target.value }))
            }
            className='w-full rounded-lg border border-gray-300 px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
            disabled={busy}
          >
            <option value='friendly'>Friendly</option>
            <option value='professional'>Professional</option>
            <option value='formal'>Formal</option>
            <option value='casual'>Casual</option>
            <option value='engaging'>Engaging</option>
            <option value='serious'>Serious</option>
            <option value='polite'>Polite</option>
            <option value='direct'>Direct</option>
            <option value='authoritative'>Authoritative</option>
            <option value='optimistic'>Optimistic</option>
          </select>
        </div>

        {/* Toggles */}
        <div className='flex items-center space-x-4'>
          <label className='flex items-center space-x-2 cursor-pointer'>
            <input
              type='checkbox'
              checked={options.emojis}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, emojis: e.target.checked }))
              }
              className='cursor-pointer w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500'
              disabled={busy}
            />
            <span className='text-sm'>Include Emojis</span>
          </label>

          <label className='flex items-center space-x-2 cursor-pointer'>
            <input
              type='checkbox'
              checked={options.hashtags}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, hashtags: e.target.checked }))
              }
              className='cursor-pointer w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500'
              disabled={busy}
            />
            <span className='text-sm'>Include Hashtags</span>
          </label>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleUploadClick}
        disabled={!file || busy}
        className='mt-4 w-full cursor-pointer disabled:cursor-not-allowed rounded-xl bg-gray-900 text-white py-3 font-medium hover:bg-gray-800 disabled:opacity-50 disabled:bg-gray-400 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center'
      >
        {busy ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Caption...
          </>
        ) : (
          'Upload & Generate Caption'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className='mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start'>
          <svg className='w-5 h-5 mr-2 flex-shrink-0 mt-0.5' fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <strong className='block'>Error:</strong>
            {error}
          </div>
        </div>
      )}
    </section>
  );
};

export default UploadCard;
