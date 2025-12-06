import base64
from datetime import datetime, timedelta, timezone
from http.client import HTTPException
import json
import re
import os
import subprocess
from uuid import uuid4
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from fastapi import FastAPI, Query, File, UploadFile, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from pdf2docx import Converter
import requests

app = FastAPI(
    title="Media & Utility Streaming API",
    description="A FastAPI backend for YouTube streaming, PDF/Word conversion, background removal, and more.",
    version="1.0.0",
    contact={"name": "Name", "email": "your@email.com"},
    license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
)

# ------------------------- License Checker -------------------------

START_TIME = datetime(2025, 8, 2, 11, 15, 0, tzinfo=timezone.utc)
EXPIRY_DURATION = timedelta(hours=10)

def check_license_validity():
    pass
    # if datetime.now(timezone.utc) > START_TIME + EXPIRY_DURATION:
    #     raise HTTPException(
    #         status_code=403,
    #         detail="License expired: API access disabled after 10 hours."
    #     )
    
# ------------------------- Helper Models -------------------------

class YouTubeFormat(BaseModel):
    quality: str
    format: str
    mime: str
    itag: str
    hasVideo: bool
    hasAudio: bool
    filesize: str

class YouTubeVideoInfo(BaseModel):
    title: str
    thumbnail: str
    duration: Optional[int]
    author: str
    viewCount: Optional[int]
    availableFormats: List[YouTubeFormat]

class YouTubeFormatsResponse(BaseModel):
    success: bool
    videoInfo: YouTubeVideoInfo

# ------------------------- Helper Functions -------------------------

def normalize_youtube_url(url: str) -> str:
    match = re.search(r'(?:youtu\.be/|v=)([a-zA-Z0-9_-]{11})', url)
    if match:
        return f'https://www.youtube.com/watch?v={match.group(1)}'
    return None

def get_mime_type(format):
    ext = format.get("ext")
    if not ext:
        return "unknown"
    if format.get("vcodec") != "none":
        return f"video/{ext}"
    elif format.get("acodec") != "none":
        return f"audio/{ext}"
    return "application/octet-stream"

def clean_youtube_url(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    v = query.get("v", [None])[0]
    if not v:
        raise ValueError("Invalid YouTube URL: missing 'v' parameter")
    clean_query = urlencode({'v': v})
    return urlunparse(parsed._replace(query=clean_query))

# ------------------------- Endpoints -------------------------


@app.get("/stream/youtube/video", tags=["YouTube"], summary="Stream selected YouTube video format", dependencies=[Depends(check_license_validity)])
async def stream_video(
    url: str = Query(..., description="YouTube video URL"),
    video_itag: int = Query(..., description="itag of selected video format")
):
    print(f"[🔗] Received URL: {url}, itag: {video_itag}")
    if "youtu.be" in url:
        url = normalize_youtube_url(url)
        if not url:
            return JSONResponse(status_code=400, content={"error": "Invalid YouTube URL format"})
    try:
        url = clean_youtube_url(url)
    except ValueError as e:
        return {"error": str(e)}
    try:
        format_selector = f"{video_itag}+bestaudio"
        print(f"[📥] Starting download: {url} with itag {video_itag}")

        # Generate a unique filename with shortened clean title
        temp_title = f"yt-video-{uuid4().hex[:8]}"
        output_template = f"{temp_title}.%(ext)s"

        cmd = [
            "yt-dlp",
            "--cookies", "youtube.com_cookies.txt",  # Path to your cookies file
            "-f", format_selector,
            "--merge-output-format", "mp4",
            "--restrict-filenames",
            "-o", output_template,
            url
        ]

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        merged_filename = None
        if process.stdout:
            for line in process.stdout:
                print(line.strip())

                # Try to detect merged filename from log
                match = re.search(r'Merging formats into "(.*?)"', line)
                if match:
                    merged_filename = match.group(1)

        process.wait()

        if process.returncode != 0:
            return JSONResponse(status_code=500, content={"error": "yt-dlp failed"})

        if not merged_filename:
            return JSONResponse(status_code=500, content={"error": "Could not determine output filename"})

        def iterfile():
            with open(merged_filename, mode="rb") as file:
                yield from file
            os.remove(merged_filename)

        print(f"[✅] Stream ready: {merged_filename}")
        headers = {
            "Content-Disposition": f'attachment; filename="{merged_filename}"'
        }

        return StreamingResponse(iterfile(), media_type="video/mp4", headers=headers)

    except Exception as e:
        print(f"[❌] Unknown error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/formats/youtube", response_model=YouTubeFormatsResponse, tags=["YouTube"], summary="Get available YouTube video formats", dependencies=[Depends(check_license_validity)])
async def get_formats(url: str = Query(..., description="YouTube video URL")):
    print(f"[🔗] Received URL: {url}")
    if "youtu.be" in url:
        url = normalize_youtube_url(url)
        if not url:
            return JSONResponse(status_code=400, content={"error": "Invalid YouTube URL format"})
    try:
        url = clean_youtube_url(url)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"success": False, "message": str(e)})

    try:
        if not url.startswith("https://"):
            return JSONResponse(status_code=400, content={"success": False, "message": "Invalid YouTube URL"})

        # Run yt-dlp to get video info in JSON
        result = subprocess.run(
            [
                "yt-dlp",
                "--cookies", "youtube.com_cookies.txt",
                "--no-playlist",
                "--dump-json",
                url
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        video_json = json.loads(result.stdout)
        formats = video_json.get("formats", [])

        quality_order = {
            "1080p": 5,
            "720p": 4,
            "480p": 3,
            "360p": 2,
            "240p": 1,
            "Audio only": 0,
        }

        # Best audio format
        audio_formats = [f for f in formats if not f.get("height") and f.get("asr") and f.get("filesize")]
        best_audio = max(audio_formats, key=lambda f: f.get("filesize", 0), default=None)
        best_audio_size = best_audio["filesize"] / 1024 / 1024 if best_audio else 6

        # Video formats with calculated total size
        filtered_formats = []
        for f in formats:
            if f.get("height"):
                quality = f.get("format_note") or f.get("height", "Unknown")
                size_mb = f.get("filesize", 0) / 1024 / 1024
                total_size = round(size_mb + best_audio_size)
                
                filtered_formats.append({
                    "quality": f.get("format_note") or f.get("height", "Unknown"),
                    "format": f.get("ext", "mp4"),
                    "mime": get_mime_type(f),
                    "itag": f.get("format_id"),
                    "hasVideo": True,
                    "hasAudio": True,
                    "filesize": f"{total_size} MB" if total_size > 0 else "Unknown",
                })

        sorted_formats = sorted(
            filtered_formats,
            key=lambda f: quality_order.get(f["quality"], 0),
            reverse=True
        )

        # Remove duplicates
        seen = set()
        unique_formats = []
        for f in sorted_formats:
            key = (f["quality"], f["format"])
            if key not in seen:
                seen.add(key)
                unique_formats.append(f)

        print(f"[📊] Available formats for {video_json.get('title')}: {len(unique_formats)} formats found")

        return JSONResponse(content={
            "success": True,
            "videoInfo": {
                "title": video_json.get("title"),
                "thumbnail": f"https://img.youtube.com/vi/{video_json.get('id')}/maxresdefault.jpg",
                "duration": video_json.get("duration"),
                "author": video_json.get("uploader", "Unknown"),
                "viewCount": video_json.get("view_count"),
                "availableFormats": unique_formats
            }
        })

    except subprocess.CalledProcessError as e:
        print("[yt-dlp error]", e.stderr)
        return JSONResponse(status_code=500, content={"success": False, "message": "yt-dlp failed to get info"})

    except Exception as e:
        print("[Unknown error]", str(e))
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@app.get("/youtube/audio-info", dependencies=[Depends(check_license_validity)])
async def get_audio_info(url: str = Query(...)):
    try:
        result = subprocess.run(
            ["yt-dlp", "--cookies", "youtube.com_cookies.txt", "--no-playlist", "--dump-json", url],
            capture_output=True,
            text=True
        )

        print("yt-dlp stderr:", result.stderr)
        # print("yt-dlp stdout:", result.stdout[:300])  # print first 300 chars to keep logs clean

        if result.returncode != 0:
            return JSONResponse(status_code=500, content={"success": False, "message": result.stderr.strip()})

        info = json.loads(result.stdout)

        # Filter valid audio formats with a numeric abr
        audio_formats = [
            f for f in info["formats"]
            if f.get("vcodec") == "none" and f.get("acodec") != "none" and isinstance(f.get("abr"), (int, float))
        ]

        if not audio_formats:
            return JSONResponse(status_code=404, content={"success": False, "message": "No valid audio formats found"})

        best_audio = max(audio_formats, key=lambda f: f["abr"])

        return {
            "success": True,
            "audioInfo": {
                "title": info.get("title", "Untitled"),
                "videoId": info.get("id", "unknown"),
                "duration": info.get("duration_string", "Unknown"),
                "format": "mp3",
                "quality": f"{best_audio.get('abr', 128)} kbps",
                "size": f"{round(best_audio.get('filesize', 0) / 1024 / 1024, 2)} MB" if best_audio.get("filesize") else "Unknown",
                "downloadUrl": f"/api/download/youtube-audio?url={url}"
            }
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Exception occurred: {str(e)}"}
        )

    
@app.get("/stream/youtube/audio", dependencies=[Depends(check_license_validity)])
async def stream_audio(url: str):
    try:
        parsed = urlparse(url)
        video_id = parse_qs(parsed.query).get("v", [""])[0]
        if not video_id:
            return JSONResponse(status_code=400, content={"error": "Invalid YouTube URL"})

        filename = f"{video_id[:11]}_{uuid4().hex[:8]}.mp3"

        cmd = [
            "yt-dlp",
            "--cookies", "youtube.com_cookies.txt",
            "-f", "bestaudio",
            "--extract-audio",
            "--audio-format", "mp3",
            "-o", filename,
            url
        ]

        subprocess.run(cmd, check=True)

        def iterfile():
            with open(filename, "rb") as f:
                yield from f
            os.remove(filename)

        return StreamingResponse(iterfile(), media_type="audio/mpeg", headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@app.post("/stream/pdf-to-word", dependencies=[Depends(check_license_validity)])
async def stream_pdf_to_word(file: UploadFile = File(...)):
    try:
        # Step 1: Save uploaded PDF to current directory
        input_filename = f"{uuid4().hex[:8]}_{file.filename}"
        input_pdf_path = os.path.abspath(input_filename)
        with open(input_pdf_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Step 2: Prepare DOCX path
        output_docx_name = input_filename.replace(".pdf", ".docx")
        output_docx_path = os.path.abspath(output_docx_name)

        # Step 3: Convert PDF → DOCX
        converter = Converter(input_pdf_path)
        converter.convert(output_docx_path)
        converter.close()

        # Step 4: Stream the DOCX file and clean up after stream is closed
        def iterfile():
            with open(output_docx_path, "rb") as f:
                yield from f

            # Cleanup after yielding the file
            os.remove(output_docx_path)
            os.remove(input_pdf_path)

        headers = {
            "Content-Disposition": f'attachment; filename="{output_docx_name}"'
        }

        return StreamingResponse(
            iterfile(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers=headers
        )

    except Exception as e:
        print("Conversion error:", e)
        return {"error": "Failed to convert and stream PDF"}
    

@app.post("/stream/remove-background", dependencies=[Depends(check_license_validity)])
async def remove_background_stream(image: UploadFile = File(...)):
    try:
        # Step 1: Save uploaded image
        input_filename = f"{uuid4().hex[:8]}_{image.filename}"
        input_path = os.path.abspath(input_filename)
        print(f"[🖼️] Saving uploaded image to {input_path}")
        with open(input_path, "wb") as f:
            content = await image.read()
            f.write(content)

        # Step 2: Prepare output filename
        output_filename = input_filename.rsplit(".", 1)[0] + "_removed.png"
        output_path = os.path.abspath(output_filename)

        # Step 3: Run custom background removal command
        # Use a list of arguments (no shell) so paths containing spaces are handled correctly
        cmd = ["rembg", "i", input_path, output_path]
        print(f"[rembg] running command: {cmd}")
        subprocess.run(cmd, check=True)

        # Step 4: Stream the file
        def iterfile():
            with open(output_path, "rb") as f:
                yield from f
            os.remove(input_path)
            os.remove(output_path)

        headers = {
            "Content-Disposition": f'attachment; filename="{output_filename}"'
        }

        return StreamingResponse(iterfile(), media_type="image/png", headers=headers)

    except Exception as e:
        print("Background removal error:", e)
        return {"error": "Failed to remove background and stream image"}
    

@app.get("/stream/video", tags=["Video"], summary="Stream best video format", dependencies=[Depends(check_license_validity)])
async def stream_best_video(url: str = Query(..., description="Video URL"), tool_type: str = Query(..., description="itag of selected video format")):
    print(f"[🔗] Received URL: {url}, Tool Type: {tool_type}")

    try:
        temp_title = f"best-{uuid4().hex[:8]}"
        output_template = f"{temp_title}.%(ext)s"

        cmd = [
            "yt-dlp",
            "--cookies", f"{tool_type}.com_cookies.txt",
            "-f", "bestvideo+bestaudio",
            "--merge-output-format", "mp4",
            "--restrict-filenames",
            "-o", output_template,
            url
        ]

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        merged_filename = None
        error_output = ""

        if process.stdout:
            for line in process.stdout:
                print(line.strip())
                error_output += line
                match = re.search(r'Merging formats into "(.*?)"', line)
                if match:
                    merged_filename = match.group(1)

        process.wait()

        if process.returncode != 0:
            # Extract specific error from yt-dlp output
            yt_error = None
            match = re.search(r'ERROR:\s+(.*)', error_output)
            if match:
                yt_error = match.group(1).strip()
            print(f"[❌] yt-dlp error: {yt_error}")
            return JSONResponse(
                status_code=400,
                content=yt_error or "yt-dlp failed with unknown error"
            )

        if not merged_filename:
            return JSONResponse(status_code=500, content={"error": "Could not determine output filename"})

        def iterfile():
            with open(merged_filename, mode="rb") as file:
                yield from file
            os.remove(merged_filename)

        print(f"[✅] Stream ready: {merged_filename}")
        headers = {
            "Content-Disposition": f'attachment; filename="{merged_filename}"'
        }

        return StreamingResponse(iterfile(), media_type="video/mp4", headers=headers)

    except Exception as e:
        print(f"[❌] Error: {str(e)}")
        return JSONResponse(status_code=500, content=str(e))

@app.get("/stream/media", tags=["Media"], summary="Download Instagram/Facebook/Twitter/TikTok stories and photos",
    dependencies=[Depends(check_license_validity)])
async def stream_media(
    url: str = Query(..., description="Media URL (photo or story)"),
    tool_type: str = Query(..., description="Platform name for cookies, e.g., instagram, facebook, twitter, tiktok")
):
    print(f"[🔗] Received Media URL: {url}, Tool Type: {tool_type}")

    try:
        temp_title = f"media-{uuid4().hex[:8]}"
        output_template = f"{temp_title}.%(ext)s"

        cmd = [
            "yt-dlp",
            "--cookies", f"{tool_type}.com_cookies.txt",  # e.g., instagram.com_cookies.txt
            "--restrict-filenames",
            "-o", output_template,
            url
        ]

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        downloaded_file = None
        error_output = ""

        if process.stdout:
            for line in process.stdout:
                print(line.strip())
                error_output += line
                match = re.search(r'\[download\] Destination: (.*?)$', line)
                if match:
                    downloaded_file = match.group(1)

        process.wait()

        if process.returncode != 0:
            # Extract specific error from yt-dlp output
            yt_error = None
            match = re.search(r'ERROR:\s+(.*)', error_output)
            if match:
                yt_error = match.group(1).strip()
            print(f"[❌] yt-dlp error: {yt_error}")
            return JSONResponse(
                status_code=400,
                content=yt_error or "yt-dlp failed with unknown error"
            )

        if not downloaded_file:
            return JSONResponse(status_code=500, content={"error": "Could not determine output filename"})

        def iterfile():
            with open(downloaded_file, mode="rb") as file:
                yield from file
            os.remove(downloaded_file)

        print(f"[✅] Stream ready: {downloaded_file}")
        headers = {
            "Content-Disposition": f'attachment; filename="{os.path.basename(downloaded_file)}"'
        }

        # Guess media type from extension
        ext = os.path.splitext(downloaded_file)[1].lower()
        media_type = "image/jpeg" if ext in [".jpg", ".jpeg", ".png"] else "video/mp4"

        return StreamingResponse(iterfile(), media_type=media_type, headers=headers)

    except Exception as e:
        print(f"[❌] Error: {str(e)}")
        return JSONResponse(status_code=500, content=str(e))

@app.get("/stream/tiktok", tags=["Video"], summary="Download TikTok video with fallback", dependencies=[Depends(check_license_validity)])
async def stream_tiktok_video(url: str = Query(..., description="TikTok Video URL")):
    print(f"[📥] TikTok download requested for URL: {url}")

    if "tiktok.com" not in url:
        return JSONResponse(status_code=400, content={"error": "Invalid TikTok URL"})

    try:    
        # === Fallback to TikWM API ===
        tikwm_api_url = f"https://www.tikwm.com/api/?url={url}"
        response = requests.get(tikwm_api_url)
        api_json = response.json()

        if not api_json.get("data") or not api_json["data"].get("play"):
            return JSONResponse(status_code=404, content={"error": "Video not found via TikWM API"})

        video_url = api_json["data"]["play"]
        fallback_filename = f"tiktok_{uuid4().hex[:8]}.mp4"

        print(f"[⬇️] Downloading fallback video from TikWM: {video_url}")
        video_response = requests.get(video_url, stream=True)
        with open(fallback_filename, "wb") as f:
            for chunk in video_response.iter_content(chunk_size=8192):
                f.write(chunk)

        def iterfile_fallback():
            with open(fallback_filename, mode="rb") as file:
                yield from file
            os.remove(fallback_filename)

        print(f"[✅] API fallback success, streaming: {fallback_filename}")
        return StreamingResponse(iterfile_fallback(), media_type="video/mp4", headers={
            "Content-Disposition": f'attachment; filename="{fallback_filename}"'
        })

    except Exception as e:
        print(f"[❌] Error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Internal Server Error", "details": str(e)})
    

@app.get("/youtube/audio-full", dependencies=[Depends(check_license_validity)])
async def get_audio_full(url: str = Query(...)):
    try:
        # Generate a unique filename
        filename = f"audio_{uuid4().hex[:8]}.mp3"
        
        # Get metadata and download audio in one command
        cmd = [
            "yt-dlp",
            "--cookies", "youtube.com_cookies.txt",
            "-f", "bestaudio",
            "--extract-audio",
            "--audio-format", "mp3",
            "-o", filename,
            "--print-json",
            url
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": result.stderr.strip()}
            )

        # Parse the JSON output from yt-dlp
        info = json.loads(result.stdout)
        
        # Read the audio file
        with open(filename, "rb") as f:
            audio_data = f.read()
        
        # Clean up the file
        os.remove(filename)
        
        # Prepare response
        return {
            "success": True,
            "audioInfo": {
                "title": info.get("title", "Untitled"),
                "videoId": info.get("id", "unknown"),
                "duration": info.get("duration_string", "Unknown"),
                "format": "mp3",
                "quality": f"{info.get('abr', 128)} kbps",
                "size": f"{round(info.get('filesize', 0) / 1024 / 1024, 2)} MB" if info.get("filesize") else "Unknown",
                "audioData": base64.b64encode(audio_data).decode('utf-8')
            }
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Exception occurred: {str(e)}"}
        )