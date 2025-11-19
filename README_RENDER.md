# Deployment Guide for Render

This project is ready to be deployed on [Render](https://render.com).

## Steps to Deploy

1.  **Push to GitHub**: Ensure your latest code is pushed to your GitHub repository.
2.  **Create New Web Service**:
    *   Go to your Render Dashboard.
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository.
3.  **Configure**:
    *   **Name**: `image-caption-ai` (or any name you like)
    *   **Runtime**: `Python 3`
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `streamlit run streamlit_app.py`
4.  **Deploy**: Click **Create Web Service**.

## Important Notes

*   **Model Size**: The app is configured to use `Salesforce/blip-image-captioning-base` to ensure it fits within the memory limits of the free tier.
*   **Data Persistence**: User accounts are stored in `users.json`. On the free tier of Render, the file system is **ephemeral**, meaning `users.json` will be reset every time the app restarts or redeploys. The default admin account (`admin` / `12345`) will always be recreated.
*   **First Run**: The first deployment might take a few minutes as it downloads the AI models.

## Configuration Files Included

*   `requirements.txt`: Optimized for CPU usage to save space.
*   `packages.txt`: Includes system dependencies like `libgl1`.
*   `render.yaml`: Infrastructure as Code definition for Render.
