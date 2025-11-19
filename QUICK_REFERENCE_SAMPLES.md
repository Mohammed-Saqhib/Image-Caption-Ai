# 📸 Sample Images - Quick Reference

## 📂 Where to Add Images

### Streamlit App:
```
sample_images/
└── your-image.jpg  ← Add here
```

### Web Frontend:
```
frontend/public/samples/
└── sample1.jpg  ← Add here (use sample1.jpg, sample2.jpg, etc.)
```

---

## 🚀 Quick Start

### 1. Add Images:
```powershell
# Copy to Streamlit folder
Copy-Item "C:\path\to\image.jpg" -Destination "sample_images\"

# Copy to Web frontend folder
Copy-Item "C:\path\to\image.jpg" -Destination "frontend\public\samples\sample1.jpg"
```

### 2. Run Apps:
```powershell
# Streamlit
streamlit run streamlit_app.py

# Web (2 terminals)
cd backend; node index.js
cd frontend; npm run dev
```

### 3. Use Samples:
- **Streamlit:** Select "🖼️ Use Sample Image" → Click thumbnail
- **Web:** Click "🖼️ Sample Images" tab → Click sample

---

## 💡 Recommended Samples

Add these 5 diverse images:
1. 🌅 Landscape/Nature
2. 👤 Portrait/People
3. 📝 Text/Sign
4. 📦 Product/Object
5. 🏙️ Cityscape/Mixed

---

## ✅ Supported Formats

- PNG (.png)
- JPEG (.jpg, .jpeg)
- GIF (.gif)
- WEBP (.webp)
- BMP (.bmp) - Streamlit only

**Max size:** 10MB (5MB recommended)

---

## 🔧 How It Works

### Streamlit:
1. Automatically scans `sample_images/` folder
2. Shows all valid images in grid
3. Click "Select" to use
4. Generate caption normally

### Web Frontend:
1. Loads predefined sample list
2. Shows available samples in grid
3. Click sample to select
4. Generate caption normally

---

## 📊 File Structure

```
Work 1/
├── sample_images/                    ← Streamlit samples
│   ├── README.md
│   ├── landscape.jpg
│   ├── portrait.png
│   └── ...
├── frontend/
│   └── public/
│       └── samples/                  ← Web samples
│           ├── README.md
│           ├── sample1.jpg
│           ├── sample2.jpg
│           └── ...
├── SAMPLE_IMAGES_GUIDE.md           ← Full guide
└── SAMPLE_IMAGES_SUMMARY.md         ← Complete summary
```

---

## 🎯 Quick Tips

✅ Use descriptive filenames
✅ Keep images under 5MB
✅ Add 5-7 diverse samples
✅ Test after adding new samples
❌ Avoid special characters in names
❌ Don't use spaces in filenames

---

## 🐛 Troubleshooting

**Samples not showing?**
1. Check folder exists
2. Verify file formats
3. Restart app
4. Clear browser cache (web)

**Can't select sample?**
1. Check file isn't corrupted
2. Verify file size < 10MB
3. Ensure correct format

---

## 📚 Full Documentation

See `SAMPLE_IMAGES_GUIDE.md` for complete details!

---

**Status:** ✅ Ready to Use
**Version:** 2.1
