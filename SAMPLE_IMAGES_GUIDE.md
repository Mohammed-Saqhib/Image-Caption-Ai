# 📸 Sample Images Guide

## Overview

Your application now supports **two ways to provide images**:
1. 📁 **Upload from PC** - Traditional file upload
2. 🖼️ **Use Sample Images** - Pre-loaded demonstration images

---

## 🗂️ Folder Structure

### For Streamlit App:
```
Work 1/
├── sample_images/           ← Add images here
│   ├── README.md
│   ├── sample1.jpg         ← Your sample images
│   ├── sample2.png
│   └── ...
└── streamlit_app.py
```

### For Web Frontend:
```
Work 1/
└── frontend/
    └── public/
        └── samples/         ← Add images here
            ├── README.md
            ├── sample1.jpg  ← Your sample images
            ├── sample2.png
            └── ...
```

---

## 🚀 Quick Setup

### Step 1: Add Sample Images

#### For Streamlit:
```powershell
# Navigate to project root
cd "d:\M JAMIL\Work 1"

# Add your images to sample_images folder
# Example: Copy images
Copy-Item "C:\path\to\your\image.jpg" -Destination "sample_images\"
```

#### For Web Frontend:
```powershell
# Navigate to frontend samples folder
cd "d:\M JAMIL\Work 1\frontend\public\samples"

# Add your images here
# Example: Copy images
Copy-Item "C:\path\to\your\image.jpg" -Destination ".\"
```

### Step 2: Use Recommended Names (Optional)

For web frontend, use these filenames for auto-detection:
- `sample1.jpg`
- `sample2.jpg`
- `sample3.jpg`
- `sample4.jpg`
- `sample5.jpg`

Or use any descriptive names - they'll all be displayed!

---

## 📋 Supported Formats

Both applications support:
- ✅ **PNG** (.png)
- ✅ **JPEG** (.jpg, .jpeg)
- ✅ **GIF** (.gif)
- ✅ **BMP** (.bmp) - Streamlit only
- ✅ **WEBP** (.webp)

---

## 💡 Recommended Sample Images

For best demonstration, include:

### 1. Text Images (OCR Testing)
- Signs and posters
- Documents with text
- Product labels
- Street signs
- Menus

### 2. Landscape Photos
- Nature scenes
- Cityscapes
- Sunset/sunrise
- Mountains, beaches

### 3. People Photos
- Portraits
- Group photos
- Candid moments
- Professional headshots

### 4. Product Images
- Electronics
- Food and beverages
- Clothing and accessories
- Home decor

### 5. Mixed Content
- Images with both text and objects
- Infographics
- Social media posts
- Advertisements

---

## 🎯 Usage Guide

### Streamlit App:

1. **Run the app:**
   ```powershell
   streamlit run streamlit_app.py
   ```

2. **Select image source:**
   - Choose "📁 Upload from PC" for your own images
   - Choose "🖼️ Use Sample Image" for pre-loaded samples

3. **For Sample Images:**
   - View thumbnail grid of all samples
   - Click "Select" button under desired image
   - Image loads automatically
   - Generate caption as usual

### Web Frontend:

1. **Run the app:**
   ```powershell
   # Terminal 1 - Backend
   cd backend
   node index.js
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Select image source:**
   - Click "📁 Upload from PC" tab
   - Or click "🖼️ Sample Images" tab

3. **For Sample Images:**
   - Browse grid of sample thumbnails
   - Click on any sample to select it
   - Selected image shows blue border
   - Generate caption as usual

---

## 🔧 Customization

### Adding More Samples (Streamlit):

Images are automatically detected from `sample_images/` folder. Just add files!

### Adding More Samples (Web Frontend):

#### Method 1: Use numbered samples (easiest)
1. Name your files: `sample1.jpg`, `sample2.jpg`, etc.
2. Place in `frontend/public/samples/`
3. Refresh browser

#### Method 2: Edit the list
1. Open `frontend/src/components/UploadCard.jsx`
2. Find the `samplesList` array:
   ```javascript
   const samplesList = [
     'sample1.jpg',
     'sample2.jpg',
     'your-image.jpg',  // Add your filenames
     'another-image.png',
   ];
   ```
3. Add your image filenames
4. Save and rebuild

---

## 📊 Best Practices

### Image Quality:
- ✅ Use high-resolution images (recommended: 1920x1080 or higher)
- ✅ Ensure good lighting and clarity
- ✅ Keep file sizes under 5MB for optimal performance
- ✅ Use JPEG for photos, PNG for graphics/text

### File Naming:
- ✅ Use descriptive names: `sunset-beach.jpg`, `coffee-cup.png`
- ✅ Avoid spaces (use hyphens or underscores)
- ✅ Use lowercase for consistency
- ❌ Avoid special characters

### Organization:
- ✅ Keep similar images together
- ✅ Update README in samples folders
- ✅ Remove unused samples periodically
- ✅ Test all samples before deployment

---

## 🐛 Troubleshooting

### Streamlit: Samples not showing?

1. **Check folder location:**
   ```powershell
   # Should exist:
   Test-Path "sample_images"
   # Should return: True
   ```

2. **Check file formats:**
   - Ensure files have correct extensions
   - Verify files aren't corrupted

3. **Refresh the app:**
   - Press `R` in Streamlit
   - Or restart: `Ctrl+C` then `streamlit run streamlit_app.py`

### Web Frontend: Samples not loading?

1. **Check folder location:**
   ```powershell
   # Should exist:
   Test-Path "frontend\public\samples"
   # Should return: True
   ```

2. **Verify filenames match:**
   - Open `UploadCard.jsx`
   - Check `samplesList` array
   - Ensure filenames match exactly

3. **Clear browser cache:**
   - Press `Ctrl+Shift+R` (hard reload)
   - Or clear cache in browser settings

4. **Check console for errors:**
   - Press `F12` in browser
   - Look for error messages
   - Verify network requests succeed

---

## 📈 Performance Tips

### Optimize Images:
```powershell
# Use online tools or ImageMagick to resize/compress:
# Example with ImageMagick (if installed):
magick convert input.jpg -resize 1920x1080 -quality 85 output.jpg
```

### Recommended Sizes:
- **Thumbnails:** 200x200 to 400x400 pixels
- **Full images:** 1920x1080 or similar
- **File size:** Under 2MB ideal, 5MB max

---

## 🎨 Example Sample Set

Here's a suggested starter set:

1. **sample1.jpg** - Landscape (nature scene)
2. **sample2.jpg** - Portrait (person smiling)
3. **sample3.jpg** - Text image (sign or poster)
4. **sample4.jpg** - Product (coffee cup, book, etc.)
5. **sample5.jpg** - Mixed (cityscape with text)

This provides diverse testing scenarios!

---

## 🔄 Updating Samples

### To replace samples:
1. Delete old images from respective folders
2. Add new images with same or different names
3. Restart app (Streamlit) or refresh browser (Web)

### To add new samples:
1. Copy images to respective folders
2. (Web only) Update `samplesList` if needed
3. Restart/refresh application

---

## ✨ Benefits of Sample Images

### For Users:
- ✅ Quick testing without finding own images
- ✅ See application capabilities immediately
- ✅ Example of what works well
- ✅ No privacy concerns with personal photos

### For Developers:
- ✅ Consistent testing scenarios
- ✅ Demonstrate different features
- ✅ Showcase OCR + caption capabilities
- ✅ Professional presentation

### For Demos:
- ✅ Instant functionality demonstration
- ✅ No upload delay
- ✅ Pre-vetted high-quality results
- ✅ Controlled testing environment

---

## 📞 Support

If you encounter issues:
1. Check this guide
2. Verify folder structure
3. Check file formats and names
4. Review browser console (web frontend)
5. Check Streamlit logs (Streamlit app)

---

## 🎉 Ready to Go!

Your application now supports **dual image sources**:
- 📁 Upload flexibility for users
- 🖼️ Sample convenience for demos

**Add your sample images and enjoy the enhanced experience!** ✨

---

**Last Updated:** November 19, 2025
**Version:** 2.0 with Sample Images Support
