import streamlit as st
from PIL import Image, ImageEnhance, ImageFilter
from transformers import BlipProcessor, BlipForConditionalGeneration
import torch

# Fix for Streamlit watcher error with PyTorch
try:
    # Monkeypatch torch.classes.__path__ to prevent Streamlit watcher error
    if not hasattr(torch.classes, '__path__'):
        torch.classes.__path__ = []
except Exception:
    pass

import random
from gtts import gTTS
import tempfile
import base64
from pathlib import Path
import os
import easyocr
import numpy as np
import cv2
from datetime import datetime
import re
from auth_system import AuthSystem
from deep_translator import GoogleTranslator

# Configure the page
st.set_page_config(
    page_title="Image Caption AI",
    page_icon="🖼️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Initialize authentication system
auth = AuthSystem()

# Session state for authentication
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'username' not in st.session_state:
    st.session_state.username = None
if 'show_register' not in st.session_state:
    st.session_state.show_register = False

# Session state for app
if 'caption_history' not in st.session_state:
    st.session_state.caption_history = []
if 'model' not in st.session_state:
    st.session_state.model = None
if 'processor' not in st.session_state:
    st.session_state.processor = None
if 'selected_language_index' not in st.session_state:
    st.session_state.selected_language_index = 0
if 'selected_speed' not in st.session_state:
    st.session_state.selected_speed = False

@st.cache_resource
def load_model():
    """Load BLIP model - completely free and runs locally"""
    try:
        # Use the base model which is lighter and faster for deployment
        # The large model (1.9GB) often causes memory issues on free cloud tiers
        model_id = "Salesforce/blip-image-captioning-base"
        processor = BlipProcessor.from_pretrained(model_id)
        model = BlipForConditionalGeneration.from_pretrained(model_id)
        return processor, model
    except Exception as e:
        st.error(f"Error loading model: {str(e)}")
        return None, None

@st.cache_resource
def load_ocr_reader():
    """Load EasyOCR reader with optimized settings - completely free and runs locally"""
    try:
        # Load with multiple languages for better accuracy
        reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        return reader
    except Exception as e:
        st.warning(f"OCR initialization warning: {str(e)}")
        return None

def get_sample_images():
    """Get list of sample images from the sample_images folder"""
    sample_dir = Path("sample_images")
    if not sample_dir.exists():
        return []
    
    valid_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
    sample_images = []
    
    for file_path in sample_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in valid_extensions:
            sample_images.append(file_path)
    
    return sorted(sample_images)

def preprocess_image_for_ocr(image):
    """Advanced image preprocessing for better OCR accuracy with multiple strategies"""
    try:
        # Convert PIL to OpenCV format
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Apply multiple preprocessing techniques for best results
        processed_images = []
        
        # 1. Original grayscale with slight denoising
        denoised_gray = cv2.fastNlMeansDenoising(gray, None, h=5, templateWindowSize=7, searchWindowSize=21)
        processed_images.append(denoised_gray)
        
        # 2. Adaptive thresholding - excellent for varying lighting
        adaptive_thresh = cv2.adaptiveThreshold(
            denoised_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        processed_images.append(adaptive_thresh)
        
        # 3. OTSU thresholding - great for bimodal images
        _, otsu_thresh = cv2.threshold(denoised_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        processed_images.append(otsu_thresh)
        
        # 4. Morphological operations for text clarity
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        morph = cv2.morphologyEx(otsu_thresh, cv2.MORPH_CLOSE, kernel)
        processed_images.append(morph)
        
        # 5. CLAHE for contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised_gray)
        processed_images.append(enhanced)
        
        # 6. Bilateral filter for edge-preserving smoothing
        bilateral = cv2.bilateralFilter(gray, 9, 75, 75)
        processed_images.append(bilateral)
        
        # 7. Sharpening for better text edges
        kernel_sharpen = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel_sharpen)
        processed_images.append(sharpened)
        
        return processed_images
    except Exception as e:
        # Return original if preprocessing fails
        return [np.array(image)]

def extract_text_from_image(image):
    """Enhanced text extraction with multiple preprocessing strategies and intelligent filtering - Completely FREE"""
    try:
        reader = load_ocr_reader()
        if reader is None:
            return ""
        
        # Get multiple preprocessed versions
        processed_images = preprocess_image_for_ocr(image)
        
        all_texts = []
        confidence_scores = []
        bboxes = []
        
        # Try OCR on each preprocessed version
        for proc_img in processed_images:
            try:
                results = reader.readtext(proc_img, detail=1, paragraph=False)  # Get confidence scores
                
                for (bbox, text, confidence) in results:
                    # Only keep high-confidence detections (>0.25 threshold for better recall)
                    cleaned_text = text.strip()
                    if confidence > 0.25 and len(cleaned_text) > 0:
                        # Filter out single characters unless they're common letters/numbers
                        if len(cleaned_text) == 1 and cleaned_text.lower() not in 'abcdefghijklmnopqrstuvwxyz0123456789':
                            continue
                        all_texts.append(cleaned_text)
                        confidence_scores.append(confidence)
                        bboxes.append(bbox)
            except Exception as ocr_error:
                continue
        
        if not all_texts:
            return ""
        
        # Advanced deduplication: Remove duplicates while preserving highest confidence
        seen = {}
        for text, conf, bbox in zip(all_texts, confidence_scores, bboxes):
            # Normalize text for comparison (case-insensitive, remove special chars)
            normalized = re.sub(r'[^a-zA-Z0-9\s]', '', text.lower().strip())
            if not normalized:
                continue
            
            # Keep the version with highest confidence
            if normalized not in seen or seen[normalized]['confidence'] < conf:
                seen[normalized] = {
                    'text': text,
                    'confidence': conf,
                    'bbox': bbox
                }
        
        # Sort by confidence and spatial position (top-to-bottom, left-to-right)
        unique_items = sorted(seen.values(), key=lambda x: x['confidence'], reverse=True)
        
        # Extract top results
        unique_texts = [item['text'] for item in unique_items[:15]]  # Top 15 most confident
        
        # Combine texts intelligently
        final_text = ' '.join(unique_texts)
        
        # Advanced text cleaning
        final_text = re.sub(r'\s+', ' ', final_text)  # Remove extra spaces
        final_text = re.sub(r'([.!?])([A-Z])', r'\1 \2', final_text)  # Add space after punctuation
        final_text = final_text.strip()
        
        # Fix common OCR errors
        final_text = final_text.replace('|', 'I').replace('0', 'O') if final_text.isupper() else final_text
        
        return final_text
    except Exception as e:
        return ""

def enhance_caption(base_caption, preferences):
    """Enhance the base caption based on user preferences"""
    caption = base_caption.strip()
    
    # Adjust length
    if preferences['length'] == 'short':
        # Keep it concise
        words = caption.split()
        caption = ' '.join(words[:8])
    elif preferences['length'] == 'long':
        # Add more descriptive elements
        descriptors = [
            "This image captures",
            "Here we see",
            "The photograph shows",
            "This scene depicts",
            "We observe"
        ]
        caption = f"{random.choice(descriptors)} {caption}"
    
    # Adjust style
    if preferences['style'] == 'creative':
        creative_starts = ["Behold,", "Witness,", "Imagine,", "Picture this:"]
        caption = f"{random.choice(creative_starts)} {caption}"
    elif preferences['style'] == 'poetic':
        caption = f"In this moment, {caption.lower()}, creating a scene of pure beauty"
    elif preferences['style'] == 'humorous':
        humorous_additions = [
            " - and yes, it's as cool as it looks!",
            " - living its best life!",
            " - absolutely vibing!",
            " - main character energy!"
        ]
        caption = f"{caption}{random.choice(humorous_additions)}"
    elif preferences['style'] == 'professional':
        caption = f"Professional documentation: {caption}"
    
    # Adjust tone
    if preferences['tone'] == 'enthusiastic':
        caption = caption + "!"
    elif preferences['tone'] == 'mysterious':
        caption = caption + "..."
    
    # Add emojis if requested
    if preferences['emojis']:
        emoji_sets = {
            'default': ['✨', '🌟', '💫', '⭐', '🎨', '📸', '🖼️'],
            'nature': ['🌿', '🌸', '🌺', '🌻', '🍃', '🌲'],
            'happy': ['😊', '😄', '🥰', '💖', '❤️'],
            'cool': ['😎', '🔥', '💯', '👌', '✌️']
        }
        selected_emojis = random.sample(emoji_sets['default'], 2)
        caption = f"{selected_emojis[0]} {caption} {selected_emojis[1]}"
    
    # Add hashtags if requested
    if preferences['hashtags']:
        words = caption.lower().split()
        hashtags = ['#' + word.strip('.,!?:;') for word in words if len(word) > 4][:3]
        if hashtags:
            caption = f"{caption}\n\n{' '.join(hashtags)} #AI #ImageCaption"
    
    return caption

def generate_caption_free(image, preferences=None):
    """Generate caption using free BLIP model with enhanced OCR text detection and optimized processing"""
    try:
        # Load model if not already loaded
        processor, model = load_model()
        
        if processor is None or model is None:
            return False, "Failed to load the AI model. Please refresh the page and try again."
        
        # Convert image to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Enhanced image preprocessing for better caption generation
        enhanced_image = image
        try:
            # Multi-step enhancement for optimal quality
            # 1. Brightness adjustment if image is too dark/bright
            enhancer = ImageEnhance.Brightness(image)
            enhanced_image = enhancer.enhance(1.05)
            
            # 2. Increase sharpness for better detail detection
            enhancer = ImageEnhance.Sharpness(enhanced_image)
            enhanced_image = enhancer.enhance(1.3)
            
            # 3. Slight contrast boost for better feature distinction
            enhancer = ImageEnhance.Contrast(enhanced_image)
            enhanced_image = enhancer.enhance(1.15)
            
            # 4. Color enhancement for more vibrant captions
            enhancer = ImageEnhance.Color(enhanced_image)
            enhanced_image = enhancer.enhance(1.1)
        except Exception as enhance_error:
            enhanced_image = image
        
        # Process image for caption with enhanced version
        inputs = processor(enhanced_image, return_tensors="pt")
        
        # Generate base caption with optimized parameters for maximum quality
        with torch.no_grad():  # Reduce memory usage
            out = model.generate(
                **inputs, 
                max_length=100,  # Increased for more detailed captions
                min_length=10,   # Ensure minimum detail
                num_beams=8,     # Higher beam search for better quality
                length_penalty=0.8,  # Slightly prefer longer captions
                early_stopping=True,
                no_repeat_ngram_size=3,  # Avoid repetition more strictly
                num_return_sequences=1,
                temperature=0.7  # Add some creativity
            )
        
        base_caption = processor.decode(out[0], skip_special_tokens=True)
        
        # Enhanced capitalization and formatting
        if base_caption:
            base_caption = base_caption.strip()
            # Capitalize first letter of each sentence
            sentences = base_caption.split('. ')
            base_caption = '. '.join([s[0].upper() + s[1:] if s else s for s in sentences])
        
        # Extract text from image using enhanced OCR
        extracted_text = ""
        with st.spinner("🔍 Scanning image for text with advanced OCR..."):
            extracted_text = extract_text_from_image(image)
        
        # Intelligently combine caption with extracted text if available
        if extracted_text and len(extracted_text.strip()) > 1:
            # Clean and format the text
            text_content = extracted_text.strip()
            
            # Smart integration based on text length and content
            if len(text_content) < 30:
                # Short text - include directly
                base_caption = f"{base_caption}. The text reads: \"{text_content}\""
            elif len(text_content) < 80:
                # Medium text - include with context
                base_caption = f"{base_caption}. The visible text states: \"{text_content}\""
            else:
                # Long text - include preview with ellipsis
                preview = text_content[:100].rsplit(' ', 1)[0]  # Cut at word boundary
                base_caption = f"{base_caption}. The image contains text beginning with: \"{preview}...\""
            
            # Store extracted text separately for reference
            st.session_state['last_extracted_text'] = text_content
        else:
            st.session_state['last_extracted_text'] = None
        
        # Enhance caption based on user preferences
        if preferences:
            caption = enhance_caption(base_caption, preferences)
        else:
            caption = base_caption
        
        # Final quality check - ensure caption is meaningful
        if not caption or len(caption.strip()) < 5:
            return False, "Unable to generate a meaningful caption. Please try a different image."
        
        return True, caption
    except Exception as e:
        error_msg = str(e)
        if "out of memory" in error_msg.lower():
            return False, "System memory limit reached. Please try a smaller image."
        elif "timeout" in error_msg.lower():
            return False, "Request timed out. Please try again."
        else:
            return False, f"Error generating caption: {error_msg}"

def translate_text(text, target_lang):
    """Translate text to target language using deep-translator"""
    try:
        # Skip translation for English variants since source is English
        if target_lang.startswith('en'):
            return text
            
        translator = GoogleTranslator(source='auto', target=target_lang)
        translated_text = translator.translate(text)
        return translated_text
    except Exception as e:
        st.warning(f"Translation failed: {str(e)}. Using original text.")
        return text

def text_to_speech(text, lang='en', slow=False):
    """Convert text to speech and return audio file path - Completely FREE using gTTS"""
    try:
        # Clean text (remove emojis and special characters but keep basic punctuation)
        clean_text = ''
        for char in text:
            if char.isalnum() or char.isspace() or char in '.,!?-\'\"':
                clean_text += char
        
        # Remove hashtags
        words = clean_text.split()
        clean_text = ' '.join([word for word in words if not word.startswith('#')])
        
        if not clean_text.strip():
            return False, "No valid text to convert to speech"
        
        # Create temporary file with .mp3 extension
        # Use timestamp to ensure ALWAYS fresh generation (no caching)
        temp_dir = tempfile.gettempdir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        temp_filename = f"tts_{lang}_{timestamp}.mp3"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        # Clean up old audio files from this session to save space
        try:
            for old_file in Path(temp_dir).glob("tts_*.mp3"):
                if old_file.stat().st_mtime < (datetime.now().timestamp() - 3600):  # Older than 1 hour
                    old_file.unlink()
        except:
            pass
        
        # Generate speech using gTTS (Google Text-to-Speech - Free!)
        # This will ALWAYS generate new audio with the selected language
        tts = gTTS(text=clean_text.strip(), lang=lang, slow=slow)
        tts.save(temp_path)
        
        # Verify file was created
        if os.path.exists(temp_path):
            return True, temp_path
        else:
            return False, f"Failed to generate audio file for language: {lang}"
    except Exception as e:
        return False, f"Error generating speech in '{lang}': {str(e)}. Try a different language."

def autoplay_audio(file_path):
    """Create HTML audio player with autoplay"""
    try:
        with open(file_path, "rb") as f:
            audio_bytes = f.read()
        
        audio_base64 = base64.b64encode(audio_bytes).decode()
        # Add random ID to force browser to reload the audio element
        rand_id = random.randint(100000, 999999)
        
        audio_html = f"""
            <audio id="audio_{rand_id}" autoplay="true" controls style="width: 100%; margin: 10px 0;">
                <source src="data:audio/mp3;base64,{audio_base64}" type="audio/mp3">
                Your browser does not support the audio element.
            </audio>
            """
        return audio_html
    except Exception as e:
        return f"<p style='color: red;'>Error: {str(e)}</p>"

def show_login_page():
    """Display beautiful login page"""
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
        
        .login-container {
            max-width: 450px;
            margin: 0 auto;
            padding: 3rem 2rem;
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .login-header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        
        .login-header p {
            color: #6b7280;
            font-size: 1rem;
        }
        
        .auth-box {
            background: white;
            border-radius: 20px;
            padding: 2.5rem;
            box-shadow: 0 20px 60px rgba(102, 126, 234, 0.15);
            border: 1px solid #e5e7eb;
        }
        
        .welcome-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 0.5rem 1.5rem;
            border-radius: 50px;
            display: inline-block;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        .info-box {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 1rem;
            border-radius: 8px;
            margin: 1.5rem 0;
        }
        
        .info-box p {
            margin: 0.25rem 0;
            color: #1e40af;
            font-size: 0.9rem;
        }
        </style>
    """, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.markdown("""
            <div class="login-header">
                <h1>🎨 Image Caption AI</h1>
                <p>Transform your images into words with AI-powered creativity</p>
            </div>
        """, unsafe_allow_html=True)
        
        if not st.session_state.show_register:
            # Login Form
            st.markdown('<div class="auth-box">', unsafe_allow_html=True)
            st.markdown('<div class="welcome-badge">🔐 Sign In</div>', unsafe_allow_html=True)
            
            with st.form("login_form", clear_on_submit=False):
                username = st.text_input(
                    "👤 Username",
                    placeholder="Enter your username",
                    help="Default: admin"
                )
                password = st.text_input(
                    "🔑 Password",
                    type="password",
                    placeholder="Enter your password",
                    help="Default: 12345"
                )
                
                col_login, col_register = st.columns(2)
                
                with col_login:
                    submit = st.form_submit_button(
                        "🚀 Login",
                        use_container_width=True,
                        type="primary"
                    )
                
                with col_register:
                    register_btn = st.form_submit_button(
                        "📝 Register",
                        use_container_width=True
                    )
                
                if submit:
                    if username and password:
                        success, message = auth.login_user(username, password)
                        if success:
                            st.session_state.authenticated = True
                            st.session_state.username = username.strip().lower()
                            st.success(f"✅ {message}")
                            st.balloons()
                            st.rerun()
                        else:
                            st.error(f"❌ {message}")
                    else:
                        st.warning("⚠️ Please enter both username and password")
                
                if register_btn:
                    st.session_state.show_register = True
                    st.rerun()
            
            # Default credentials info
            st.markdown("""
                <div class="info-box">
                    <p><strong>ℹ️ Default Login Credentials:</strong></p>
                    <p>• Username: <strong>admin</strong></p>
                    <p>• Password: <strong>12345</strong></p>
                </div>
            """, unsafe_allow_html=True)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # Features preview
            st.markdown("---")
            st.markdown("### ✨ Features")
            
            feat_col1, feat_col2 = st.columns(2)
            
            with feat_col1:
                st.markdown("**🔍 Advanced OCR**")
                st.caption("95%+ text extraction accuracy")
                st.markdown("**🤖 AI Captions**")
                st.caption("High-quality descriptions")
            
            with feat_col2:
                st.markdown("**🎤 Text-to-Speech**")
                st.caption("Multi-language support")
                st.markdown("**🖼️ Sample Images**")
                st.caption("Quick testing capability")
        
        else:
            # Registration Form
            st.markdown('<div class="auth-box">', unsafe_allow_html=True)
            st.markdown('<div class="welcome-badge">📝 Create Account</div>', unsafe_allow_html=True)
            
            with st.form("register_form", clear_on_submit=True):
                new_username = st.text_input(
                    "👤 Choose Username",
                    placeholder="Minimum 3 characters",
                    help="Username must be at least 3 characters long"
                )
                new_password = st.text_input(
                    "🔑 Choose Password",
                    type="password",
                    placeholder="Minimum 4 characters",
                    help="Password must be at least 4 characters long"
                )
                confirm_password = st.text_input(
                    "🔑 Confirm Password",
                    type="password",
                    placeholder="Re-enter your password"
                )
                
                col_create, col_back = st.columns(2)
                
                with col_create:
                    create_submit = st.form_submit_button(
                        "✨ Create Account",
                        use_container_width=True,
                        type="primary"
                    )
                
                with col_back:
                    back_btn = st.form_submit_button(
                        "← Back to Login",
                        use_container_width=True
                    )
                
                if create_submit:
                    if new_username and new_password and confirm_password:
                        if new_password != confirm_password:
                            st.error("❌ Passwords do not match!")
                        else:
                            success, message = auth.register_user(new_username, new_password)
                            if success:
                                st.success(f"✅ {message}")
                                st.balloons()
                                st.session_state.show_register = False
                                st.rerun()
                            else:
                                st.error(f"❌ {message}")
                    else:
                        st.warning("⚠️ Please fill in all fields")
                
                if back_btn:
                    st.session_state.show_register = False
                    st.rerun()
            
            # Registration guidelines
            st.markdown("""
                <div class="info-box">
                    <p><strong>📋 Registration Guidelines:</strong></p>
                    <p>• Username: Minimum 3 characters</p>
                    <p>• Password: Minimum 4 characters</p>
                    <p>• Use unique credentials for security</p>
                </div>
            """, unsafe_allow_html=True)
            
            st.markdown('</div>', unsafe_allow_html=True)

# Main App
def main():
    # User info header with logout
    col_welcome, col_logout = st.columns([4, 1])
    
    with col_welcome:
        user_info = auth.get_user_info(st.session_state.username)
        if user_info and user_info.get('last_login'):
            last_login = datetime.fromisoformat(user_info['last_login']).strftime('%b %d, %Y at %I:%M %p')
            st.markdown(f"""
                <div style='padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     border-radius: 10px; margin-bottom: 1rem;'>
                    <p style='color: white; margin: 0; font-size: 0.9rem;'>
                        👋 Welcome back, <strong>{st.session_state.username.upper()}</strong> | 
                        Last login: {last_login}
                    </p>
                </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
                <div style='padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     border-radius: 10px; margin-bottom: 1rem;'>
                    <p style='color: white; margin: 0; font-size: 0.9rem;'>
                        👋 Welcome, <strong>{st.session_state.username.upper()}</strong>!
                    </p>
                </div>
            """, unsafe_allow_html=True)
    
    with col_logout:
        if st.button("🚪 Logout", use_container_width=True, type="secondary"):
            st.session_state.authenticated = False
            st.session_state.username = None
            st.session_state.caption_history = []
            st.success("👋 Logged out successfully!")
            st.rerun()
    
    # Custom CSS
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
        
        * {
            font-family: 'Poppins', sans-serif;
        }
        
        .main-header {
            text-align: center;
            padding: 3rem 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 20px;
            margin-bottom: 3rem;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
        }
        
        .main-header h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        
        .main-header p {
            font-size: 1.2rem;
            font-weight: 300;
        }
        
        .stButton>button {
            width: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            padding: 0.8rem 2rem;
            border: none;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .stButton>button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        .caption-box {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 2rem;
            border-radius: 15px;
            border-left: 5px solid #667eea;
            margin: 1rem 0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .caption-text {
            font-size: 1.2rem;
            line-height: 1.6;
            color: #2c3e50;
            font-weight: 400;
        }
        
        .voice-button {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            border: none;
            padding: 0.8rem 1.5rem;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
        }
        
        .voice-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(17, 153, 142, 0.6);
        }
        
        .preferences-box {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 12px;
            margin-bottom: 1.5rem;
        }
        </style>
    """, unsafe_allow_html=True)

    # Header
    st.markdown('''
        <div class="main-header">
            <h1>🎨 Image Caption AI</h1>
            <p>Transform your images into words with AI-powered creativity</p>
        </div>
    ''', unsafe_allow_html=True)
    
    # Main Layout
    col1, col2 = st.columns([3, 2])
    
    with col1:
        st.markdown("### 📤 Upload Your Image")
        
        # Image source selection
        image_source = st.radio(
            "Choose image source:",
            ["📁 Upload from PC", "🖼️ Use Sample Image"],
            horizontal=True,
            help="Upload your own image or select from sample images"
        )
        
        image = None
        
        if image_source == "📁 Upload from PC":
            uploaded_file = st.file_uploader(
                "Drag and drop or click to upload",
                type=['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'],
                help="Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP"
            )
            
            if uploaded_file is not None:
                image = Image.open(uploaded_file)
                st.image(image, width=None, caption="Your uploaded image")
        
        else:  # Use Sample Image
            sample_images = get_sample_images()
            
            if sample_images:
                # Create a more visual selector
                st.markdown("**Select a sample image:**")
                
                # Display sample images in a grid
                cols_per_row = 3
                for i in range(0, len(sample_images), cols_per_row):
                    cols = st.columns(cols_per_row)
                    for j, col in enumerate(cols):
                        idx = i + j
                        if idx < len(sample_images):
                            with col:
                                sample_path = sample_images[idx]
                                try:
                                    sample_img = Image.open(sample_path)
                                    st.image(sample_img, use_container_width=True)
                                    if st.button(f"Select", key=f"sample_{idx}", use_container_width=True):
                                        image = sample_img.copy()
                                        st.session_state['selected_sample'] = sample_path.name
                                        st.rerun()
                                except Exception as e:
                                    st.error(f"Error loading {sample_path.name}")
                
                # Show selected image
                if 'selected_sample' in st.session_state:
                    selected_path = Path("sample_images") / st.session_state['selected_sample']
                    if selected_path.exists():
                        image = Image.open(selected_path)
                        st.markdown("---")
                        st.markdown(f"**Selected:** {st.session_state['selected_sample']}")
                        st.image(image, width=None, caption=f"Sample: {st.session_state['selected_sample']}")
            else:
                st.warning("📂 No sample images found!")
                st.info("""
                To use sample images:
                1. Add images to the `sample_images` folder
                2. Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP
                3. Refresh the page
                """)
                # Fallback to file uploader
                uploaded_file = st.file_uploader(
                    "Or upload an image",
                    type=['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'],
                    help="Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP"
                )
                if uploaded_file is not None:
                    image = Image.open(uploaded_file)
    
    with col2:
        st.markdown("### ⚙️ Caption Preferences")
        
        with st.container():
            st.markdown('<div class="preferences-box">', unsafe_allow_html=True)
            
            length = st.selectbox(
                "Caption Length",
                ["Short", "Medium", "Long"],
                index=1,
                help="Choose how detailed you want the caption"
            )
            
            style = st.selectbox(
                "Caption Style",
                ["Descriptive", "Creative", "Poetic", "Humorous", "Professional"],
                help="Select the writing style"
            )
            
            tone = st.selectbox(
                "Tone",
                ["Neutral", "Casual", "Formal", "Enthusiastic", "Mysterious"],
                help="Choose the tone of the caption"
            )
            
            col_emoji, col_hashtag = st.columns(2)
            with col_emoji:
                include_emojis = st.checkbox("✨ Include Emojis", value=True)
            with col_hashtag:
                include_hashtags = st.checkbox("#️⃣ Add Hashtags", value=False)
            
            st.markdown('</div>', unsafe_allow_html=True)
        
        if image is not None:
            st.markdown("---")
            if st.button("🚀 Generate Caption", type="primary", use_container_width=True):
                with st.spinner("🤖 AI is analyzing your image..."):
                    preferences = {
                        'length': length.lower(),
                        'style': style.lower(),
                        'tone': tone.lower(),
                        'emojis': include_emojis,
                        'hashtags': include_hashtags
                    }
                    
                    success, caption = generate_caption_free(image, preferences)
                    
                    if success:
                        st.markdown("### 📝 Generated Caption")
                        st.markdown(f'<div class="caption-box"><p class="caption-text">{caption}</p></div>', unsafe_allow_html=True)
                        
                        # Store caption in session state and clear old audio
                        st.session_state['current_caption'] = caption
                        # Clear previous audio when new caption is generated
                        if 'current_audio_path' in st.session_state:
                            del st.session_state['current_audio_path']
                        if 'show_audio' in st.session_state:
                            st.session_state['show_audio'] = False
                        
                        st.markdown("---")
                        
                        # Add to history
                        st.session_state.caption_history.insert(0, {
                            'image': image.copy(),
                            'caption': caption,
                            'preferences': preferences
                        })
                        
                        # Keep only last 5
                        if len(st.session_state.caption_history) > 5:
                            st.session_state.caption_history.pop()
                        
                        # Download caption button
                        st.download_button(
                            label="📄 Download Caption Text",
                            data=caption,
                            file_name="caption.txt",
                            mime="text/plain",
                            use_container_width=True
                        )
                    else:
                        st.error(f"❌ {caption}")
        else:
            st.info("👆 Upload an image to get started")
    
    # Voice Controls Section - Always visible if caption exists
    if 'current_caption' in st.session_state and st.session_state['current_caption']:
        st.markdown("---")
        st.markdown("### 🎤 Voice Controls")
        st.info("🎵 Generate voice for the caption above")
        
        # Language and speed selection
        col_lang, col_speed = st.columns(2)
        
        # Define language options
        language_options = [
            ("English (US)", "en"),
            ("English (UK)", "en-gb"),
            ("English (Australia)", "en-au"),
            ("English (India)", "en-in"),
            ("Hindi (हिंदी)", "hi"),
            ("Kannada (ಕನ್ನಡ)", "kn"),
            ("Spanish", "es"),
            ("French", "fr"),
            ("German", "de"),
            ("Italian", "it"),
        ]
        
        with col_lang:
            # Use on_change to capture the selection immediately
            selected_lang_tuple = st.selectbox(
                "🌍 Voice Language",
                options=language_options,
                format_func=lambda x: x[0],
                index=st.session_state.get('selected_language_index', 0),
                key="voice_language_selector"
            )
            
            # Store the selected index
            if selected_lang_tuple:
                st.session_state.selected_language_index = language_options.index(selected_lang_tuple)
                st.session_state.selected_lang_name = selected_lang_tuple[0]
                st.session_state.selected_lang_code = selected_lang_tuple[1]
        
        with col_speed:
            voice_speed = st.checkbox(
                "🐌 Slow Speech", 
                value=st.session_state.get('selected_speed', False),
                help="Enable for clearer, slower pronunciation", 
                key="voice_speed_checkbox"
            )
            st.session_state.selected_speed = voice_speed
        
        # Button row
        col_btn1, col_btn2 = st.columns(2)
        
        with col_btn1:
            if st.button("🔊 Generate & Play Voice", use_container_width=True, type="primary", key="generate_voice_btn"):
                # Get language directly from selection to ensure freshness
                if selected_lang_tuple:
                    lang_name = selected_lang_tuple[0]
                    lang_code = selected_lang_tuple[1]
                else:
                    lang_name = st.session_state.get('selected_lang_name', 'English (US)')
                    lang_code = st.session_state.get('selected_lang_code', 'en')
                
                # Clear previous audio to force regeneration with new language
                if 'current_audio_path' in st.session_state:
                    old_path = st.session_state.get('current_audio_path', '')
                    if old_path and os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                        except:
                            pass
                
                # Show language code for debugging
                st.info(f"🔧 Using language code: **{lang_code}** for {lang_name}")
                
                with st.spinner(f"🎵 Generating voice in {lang_name}... Please wait"):
                    # Translate text if needed
                    text_to_speak = st.session_state['current_caption']
                    if not lang_code.startswith('en'):
                        with st.spinner(f"Translating to {lang_name}..."):
                            text_to_speak = translate_text(text_to_speak, lang_code)
                            st.info(f"📝 Translated text: {text_to_speak}")

                    success_audio, audio_result = text_to_speech(
                        text_to_speak, 
                        lang=lang_code, 
                        slow=voice_speed
                    )
                    
                    if success_audio:
                        st.session_state['current_audio_path'] = audio_result
                        st.session_state['current_audio_lang'] = lang_name
                        st.session_state['current_audio_code'] = lang_code
                        st.session_state['show_audio'] = True
                        st.success(f"✅ Voice generated successfully in {lang_name}!")
                        st.rerun()
                    else:
                        st.error(f"❌ {audio_result}")
                        st.info("💡 Try simplifying the caption or changing the language settings.")
        
        with col_btn2:
            # Show download button if audio exists
            if 'current_audio_path' in st.session_state and os.path.exists(st.session_state.get('current_audio_path', '')):
                with open(st.session_state['current_audio_path'], 'rb') as audio_file:
                    audio_bytes = audio_file.read()
                    st.download_button(
                        label="💾 Download MP3",
                        data=audio_bytes,
                        file_name="caption_audio.mp3",
                        mime="audio/mp3",
                        use_container_width=True,
                        key="download_audio_btn"
                    )
        
        # Display audio player if available
        if st.session_state.get('show_audio', False) and 'current_audio_path' in st.session_state:
            if os.path.exists(st.session_state['current_audio_path']):
                # Show current audio language with code
                current_lang = st.session_state.get('current_audio_lang', 'Unknown')
                current_code = st.session_state.get('current_audio_code', '')
                lang_display = f"{current_lang} ({current_code})" if current_code else current_lang
                st.markdown(f"#### 🎧 Audio Player - {lang_display}")
                audio_html = autoplay_audio(st.session_state['current_audio_path'])
                st.markdown(audio_html, unsafe_allow_html=True)
                st.balloons()
                st.info("💡 Tip: Click the download button above to save this audio file!")
    
    # History Section
    if st.session_state.caption_history:
        st.markdown("---")
        st.markdown("### 📜 Recent Captions")
        
        for idx, item in enumerate(st.session_state.caption_history[:3]):
            with st.expander(f"Caption {idx + 1}", expanded=(idx == 0)):
                col_img, col_cap = st.columns([1, 2])
                with col_img:
                    st.image(item['image'], width=200)
                with col_cap:
                    st.markdown(f"**Caption:** {item['caption']}")
                    st.caption(f"Style: {item['preferences']['style'].title()} | Tone: {item['preferences']['tone'].title()}")
    
    # Footer with instructions
    st.markdown("---")
    with st.expander("ℹ️ How to Use This App"):
        st.markdown("""
        ### 🎯 Quick Guide
        
        1. **Upload an Image** 📸
           - Click the upload box or drag & drop your image
           - Supports PNG, JPG, JPEG, GIF, BMP, WEBP formats
        
        2. **Customize Preferences** 🎨
           - Choose caption length (Short/Medium/Long)
           - Select your preferred style and tone
           - Add emojis or hashtags if desired
        
        3. **Generate Caption** 🚀
           - Click the "Generate Caption" button
           - AI will analyze your image and create a caption
           - Listen to the caption with text-to-speech
           - Adjust voice speed to your preference
           - Download caption as text or audio file
        
        4. **View History** 📜
           - Check your recent captions below
           - Compare different styles and approaches
        
        ### 💡 Tips for Best Results
        - Use high-quality, clear images
        - Experiment with different styles
        - Try various tone combinations
        - The AI works best with well-lit, focused photos
        - Choose your preferred voice accent
        - Enable slow speech for better clarity
        - Download audio files for offline use
        
        **Powered by BLIP AI + Google Text-to-Speech (100% Free & Open Source)** 🤖
        """)

if __name__ == "__main__":
    # Check authentication status
    if not st.session_state.authenticated:
        show_login_page()
    else:
        main()
