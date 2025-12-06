#!/bin/bash

echo "🔑 Make sure you've downloaded YouTube cookies using the Chrome extension:"
echo "👉 https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
echo "💾 Save the file as 'youtube.com_cookies.txt' and place it in this folder."

read -p "Press Enter to continue after placing the cookies file..."

echo "📦 Updating packages and installing ffmpeg..."
#sudo apt update && sudo apt install -y ffmpeg

echo "🐍 Creating virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install -r requirement.txt

echo "🚀 Starting FastAPI server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
