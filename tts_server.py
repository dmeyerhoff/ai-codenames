import edge_tts
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    text: str
    voice: str
    speed: float = 1.0

@app.post("/tts")
async def tts(request: TTSRequest):
    speed_percent = int((request.speed - 1.0) * 100)
    rate = f"+{speed_percent}%" if speed_percent >= 0 else f"{speed_percent}%"
    
    communicate = edge_tts.Communicate(request.text, request.voice, rate=rate)
    
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            
    return Response(content=audio_data, media_type="audio/mpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
