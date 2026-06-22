"""Google Gemini Flash — direct REST integration for video understanding.

Counts distinct Telegram member usernames visible in an uploaded screen recording.
Uses Files API (resumable upload) → generateContent with JSON response schema.

This is fully deterministic per video: same video = same count (Gemini is consistent
on identical inputs for counting/extraction tasks).

Free tier: ai.google.dev gives ~1500 requests/day free.
"""
import asyncio
import httpx
import json
import logging
import os
from typing import Optional

log = logging.getLogger("gemini")

GEMINI_BASE = "https://generativelanguage.googleapis.com"
DEFAULT_MODEL = "gemini-2.5-flash"  # fast, supports video, free tier eligible

ANALYSIS_PROMPT = """You are analyzing a screen recording of a Telegram group or channel members list.

Carefully count the DISTINCT visible Telegram member usernames/profile entries shown across all frames of the video.
- Count each unique member only ONCE (even if they scroll past multiple times)
- Distinguish premium members (those with a star/premium badge or gift badge icon)
- If a username is partially obscured or unclear, do NOT count it
- Be precise — this count determines worker salary

Return ONLY a single JSON object with this exact schema:
{
  "count": <integer — total distinct members visible>,
  "premium_count": <integer — members with premium/gift badges>,
  "confidence": "high" | "medium" | "low",
  "sample_names": [<up to 8 visible member display names as strings>]
}

No markdown, no explanation outside JSON."""


async def get_gemini_config(db) -> Optional[dict]:
    doc = await db.settings.find_one({"key": "gemini"}, {"_id": 0})
    return doc


async def _upload_file(client: httpx.AsyncClient, api_key: str, file_path: str, mime_type: str) -> str:
    """Resumable upload → returns Gemini file URI."""
    file_size = os.path.getsize(file_path)
    # Phase 1 — start upload
    start_url = f"{GEMINI_BASE}/upload/v1beta/files?key={api_key}"
    headers = {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(file_size),
        "X-Goog-Upload-Header-Content-Type": mime_type,
        "Content-Type": "application/json",
    }
    body = {"file": {"display_name": os.path.basename(file_path)}}
    r1 = await client.post(start_url, headers=headers, json=body)
    r1.raise_for_status()
    upload_url = r1.headers.get("x-goog-upload-url") or r1.headers.get("X-Goog-Upload-URL")
    if not upload_url:
        raise RuntimeError("No upload URL returned")

    # Phase 2 — upload bytes
    with open(file_path, "rb") as f:
        content = f.read()
    headers2 = {
        "Content-Length": str(file_size),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
    }
    r2 = await client.post(upload_url, headers=headers2, content=content)
    r2.raise_for_status()
    data = r2.json()
    file_obj = data.get("file", {})
    return file_obj.get("uri"), file_obj.get("name"), file_obj.get("mime_type", mime_type)


async def _wait_active(client: httpx.AsyncClient, api_key: str, file_name: str, timeout: int = 90) -> bool:
    """Poll until file state == ACTIVE."""
    url = f"{GEMINI_BASE}/v1beta/{file_name}?key={api_key}"
    elapsed = 0
    while elapsed < timeout:
        r = await client.get(url)
        if r.status_code == 200:
            state = r.json().get("state")
            if state == "ACTIVE":
                return True
            if state == "FAILED":
                return False
        await asyncio.sleep(2)
        elapsed += 2
    return False


async def _delete_file(client: httpx.AsyncClient, api_key: str, file_name: str) -> None:
    try:
        await client.delete(f"{GEMINI_BASE}/v1beta/{file_name}?key={api_key}")
    except Exception:
        pass


async def analyze_video(api_key: str, video_path: str, model: str = DEFAULT_MODEL) -> dict:
    """Run Gemini video analysis on the given file. Returns:
        {ok, count, premium_count, confidence, sample_names, error?, raw?}
    """
    if not api_key or not api_key.strip():
        return {"ok": False, "error": "Gemini API key not configured"}
    if not os.path.exists(video_path):
        return {"ok": False, "error": "Video file missing"}

    mime = "video/mp4"
    if video_path.lower().endswith((".mov", ".qt")):
        mime = "video/quicktime"
    elif video_path.lower().endswith(".avi"):
        mime = "video/x-msvideo"
    elif video_path.lower().endswith(".webm"):
        mime = "video/webm"

    async with httpx.AsyncClient(timeout=180) as client:
        try:
            file_uri, file_name, mime_resp = await _upload_file(client, api_key, video_path, mime)
            log.info(f"Gemini upload OK: {file_name}")
        except httpx.HTTPStatusError as e:
            return {"ok": False, "error": f"Upload failed: {e.response.status_code} {e.response.text[:200]}"}
        except Exception as e:
            return {"ok": False, "error": f"Upload error: {str(e)[:200]}"}

        active = await _wait_active(client, api_key, file_name)
        if not active:
            await _delete_file(client, api_key, file_name)
            return {"ok": False, "error": "Video processing timed out on Gemini"}

        # Call generateContent
        gen_url = f"{GEMINI_BASE}/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"file_data": {"mime_type": mime_resp, "file_uri": file_uri}},
                    {"text": ANALYSIS_PROMPT},
                ],
            }],
            "generationConfig": {
                "temperature": 0.0,  # deterministic
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "count": {"type": "integer"},
                        "premium_count": {"type": "integer"},
                        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                        "sample_names": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["count", "premium_count", "confidence"],
                },
            },
        }
        try:
            r = await client.post(gen_url, json=payload)
            await _delete_file(client, api_key, file_name)
            if r.status_code != 200:
                return {"ok": False, "error": f"Gemini API: {r.status_code} {r.text[:200]}"}
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text)
            return {
                "ok": True,
                "count": int(parsed.get("count", 0)),
                "premium_count": int(parsed.get("premium_count", 0)),
                "confidence": parsed.get("confidence", "medium"),
                "sample_names": parsed.get("sample_names", []),
            }
        except Exception as e:
            await _delete_file(client, api_key, file_name)
            return {"ok": False, "error": f"Analysis error: {str(e)[:200]}"}


async def test_api_key(api_key: str) -> dict:
    """Lightweight sanity check — fetches model list."""
    if not api_key or not api_key.strip():
        return {"ok": False, "error": "API key empty"}
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(f"{GEMINI_BASE}/v1beta/models?key={api_key}")
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])][:5]
                return {"ok": True, "models_sample": models}
            return {"ok": False, "error": f"Gemini: {r.status_code} {r.text[:150]}"}
        except Exception as e:
            return {"ok": False, "error": f"Network: {str(e)[:150]}"}
