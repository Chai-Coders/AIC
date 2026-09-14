import os
import time
import requests

MUX_API_BASE = 'https://api.mux.com/video/v1'


def get_mux_auth():
    token_id = os.environ.get('MUX_TOKEN_ID', '0ae31943-7160-4e48-9a2f-a92073bd0228')
    token_secret = os.environ.get('MUX_TOKEN_SECRET', 'hLJ+LIzoCcfW8F0Kon6oK8HcIaruyY2fAP9hXIwVfF2Xp8JfJYNh4M7VKlAVbj7SBHS2AvdrrSM')
    return (token_id, token_secret)


def delete_mux_asset(asset_id):
    """Deletes an asset from Mux when it is replaced."""
    if not asset_id:
        return
    try:
        url = f"{MUX_API_BASE}/assets/{asset_id}"
        requests.delete(url, auth=get_mux_auth(), timeout=10)
    except Exception as e:
        print(f"Warning: Failed to delete previous Mux asset {asset_id}: {e}")


def upload_video_to_mux(file_obj, filename="background_video.mp4"):
    """
    Uploads a video file to Mux via Direct Upload:
    1. Requests direct upload URL from Mux API
    2. Uploads binary data to upload URL
    3. Retrieves asset_id and playback_id
    Returns dict with mux_asset_id, mux_playback_id, and streaming_url
    """
    auth = get_mux_auth()

    # Step 1: Create Direct Upload on Mux
    create_upload_url = f"{MUX_API_BASE}/uploads"
    payload = {
        "cors_origin": "*",
        "new_asset_settings": {
            "playback_policy": ["public"],
            "video_quality": "basic"
        }
    }

    upload_res = requests.post(create_upload_url, json=payload, auth=auth, timeout=15)
    upload_res.raise_for_status()
    upload_data = upload_res.json().get('data', {})

    upload_id = upload_data.get('id')
    put_url = upload_data.get('url')

    if not put_url or not upload_id:
        raise ValueError("Failed to obtain upload URL from Mux API")

    # Step 2: Upload the binary content of the video file to Mux
    file_obj.seek(0)
    put_headers = {
        'Content-Type': getattr(file_obj, 'content_type', 'video/mp4') or 'video/mp4'
    }

    # Upload using chunks/stream
    put_res = requests.put(put_url, data=file_obj, headers=put_headers, timeout=120)
    put_res.raise_for_status()

    # Step 3: Poll Mux for Asset ID (up to 15 seconds)
    asset_id = None
    for _ in range(15):
        time.sleep(1)
        check_res = requests.get(f"{MUX_API_BASE}/uploads/{upload_id}", auth=auth, timeout=10)
        if check_res.ok:
            data = check_res.json().get('data', {})
            asset_id = data.get('asset_id')
            if asset_id:
                break

    if not asset_id:
        # Fallback: check asset list if created
        assets_res = requests.get(f"{MUX_API_BASE}/assets?limit=1", auth=auth, timeout=10)
        if assets_res.ok and assets_res.json().get('data'):
            asset_id = assets_res.json()['data'][0].get('id')

    if not asset_id:
        raise RuntimeError("Video uploaded to Mux but asset creation timed out")

    # Step 4: Retrieve Asset and Playback ID
    playback_id = None
    for _ in range(10):
        asset_res = requests.get(f"{MUX_API_BASE}/assets/{asset_id}", auth=auth, timeout=10)
        if asset_res.ok:
            asset_info = asset_res.json().get('data', {})
            playback_ids = asset_info.get('playback_ids', [])
            if playback_ids:
                playback_id = playback_ids[0].get('id')
                break
        time.sleep(1)

    if not playback_id:
        raise RuntimeError(f"Asset {asset_id} created in Mux but no playback ID generated")

    streaming_url = f"https://stream.mux.com/{playback_id}.m3u8"
    thumbnail_url = f"https://image.mux.com/{playback_id}/thumbnail.jpg"

    return {
        "mux_upload_id": upload_id,
        "mux_asset_id": asset_id,
        "mux_playback_id": playback_id,
        "video_url": streaming_url,
        "thumbnail_url": thumbnail_url,
    }
