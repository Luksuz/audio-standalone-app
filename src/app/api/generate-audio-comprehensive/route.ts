import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenlabs = elevenLabsApiKey ? new ElevenLabsClient({ apiKey: elevenLabsApiKey }) : null;

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const FISH_AUDIO_MODEL_DEFAULT = "speech-1.5";

export async function POST(request: Request) {
  const requestBody = await request.json();
  const { text, provider, voice, model, elevenLabsVoiceId, fishAudioVoiceId, fishAudioModel, chunkIndex = 0, userId = "unknown_user" } = requestBody;

  console.log("📥 Received single chunk audio generation request");
  console.log(`🔍 Request details: provider=${provider}, voice=${voice}, chunkIndex=${chunkIndex}, text length=${text?.length || 0}`);

  if (!text || !provider) {
    return NextResponse.json({ error: "Missing required fields: text and provider are required" }, { status: 400 });
  }

  // Provider-specific validation
  switch (provider) {
    case "elevenlabs":
      if (!elevenLabsVoiceId) {
        return NextResponse.json({ error: "Missing required field 'elevenLabsVoiceId' for ElevenLabs" }, { status: 400 });
      }
      break;
    case "fishaudio":
      if (!fishAudioVoiceId) {
        return NextResponse.json({ error: "Missing required field 'fishAudioVoiceId' for Fish Audio" }, { status: 400 });
      }
      if (!FISH_AUDIO_API_KEY) {
        return NextResponse.json({ error: "Fish Audio API key not configured" }, { status: 500 });
      }
      break;
    default:
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  try {
    console.log(`🔊 [Chunk ${chunkIndex}] Generating for provider: ${provider}, length: ${text.length}`);
    
    let audioBuffer: Buffer;
    const filename = `${provider}-${voice?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}-chunk${chunkIndex}-${Date.now()}.mp3`;

    switch (provider) {
      case "elevenlabs":
        if (!elevenlabs) throw new Error(`ElevenLabs client not initialized [Chunk ${chunkIndex}]`);
        if (!elevenLabsVoiceId) throw new Error(`Missing elevenLabsVoiceId [Chunk ${chunkIndex}]`);
        
        console.log(`🧪 [Chunk ${chunkIndex}] ElevenLabs: voiceId=${elevenLabsVoiceId}`);
        
        const elAudioStream = await elevenlabs.textToSpeech.convert(elevenLabsVoiceId, {
          text: text,
          modelId: "eleven_multilingual_v2",
          outputFormat: "mp3_44100_128"
        });

        // Convert ReadableStream to async iterator and collect chunks
        const elStreamChunks: Uint8Array[] = [];
        const reader = elAudioStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) elStreamChunks.push(value);
        }
        const elConcatenatedUint8Array = new Uint8Array(elStreamChunks.reduce((acc, streamChunk) => acc + streamChunk.length, 0));
        let offset = 0;
        for (const streamChunk of elStreamChunks) { 
          elConcatenatedUint8Array.set(streamChunk, offset); 
          offset += streamChunk.length; 
        }
        audioBuffer = Buffer.from(elConcatenatedUint8Array);
        break;

      case "fishaudio":
        if (!fishAudioVoiceId) throw new Error(`Missing fishAudioVoiceId for Fish Audio [Chunk ${chunkIndex}]`);
        const fishModelToUse = fishAudioModel || FISH_AUDIO_MODEL_DEFAULT;
        console.log(`🐠 [Chunk ${chunkIndex}] Fish Audio: voiceId=${fishAudioVoiceId}, model=${fishModelToUse}, textLength=${text.length}`);
        
        const fishRequestBody = {
          text: text, 
          format: "mp3", 
          mp3_bitrate: 128,
          reference_id: fishAudioVoiceId, 
          normalize: true, 
          latency: "normal",
        };
        console.log(`🐠 [Chunk ${chunkIndex}] Fish Audio request body:`, fishRequestBody);
        
        const fishResponse = await fetch("https://api.fish.audio/v1/tts", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`, 
            "Content-Type": "application/json", 
            "Model": fishModelToUse 
          },
          body: JSON.stringify(fishRequestBody)
        });

        if (!fishResponse.ok) {
          let errorBody = '';
          try { errorBody = await fishResponse.text(); } catch (e) { /* ignore */ }
          throw new Error(`Fish Audio API error [Chunk ${chunkIndex}]: ${fishResponse.status} ${fishResponse.statusText}. Body: ${errorBody}`);
        }

        // Fish Audio returns the audio directly as a buffer
        const fishAudioArrayBuffer = await fishResponse.arrayBuffer();
        audioBuffer = Buffer.from(fishAudioArrayBuffer);
        break;

      default:
        throw new Error(`Unsupported provider: ${provider} [Chunk ${chunkIndex}]`);
    }

    // Convert audio buffer to base64 data URL
    const base64Audio = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    const duration = Math.ceil(text.length / 15); // Rough estimate

    console.log(`✅ [Chunk ${chunkIndex}] Audio generated successfully as data URL (${audioBuffer.length} bytes)`);
    
    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      audioData: base64Audio,
      duration: duration,
      provider,
      voice,
      chunkIndex,
      filename: filename,
      size: audioBuffer.length
    });

  } catch (error: any) {
    console.error(`❌ Error generating audio for chunk ${chunkIndex}:`, error.message);
    return NextResponse.json(
      { error: `Failed to generate audio: ${error.message}` },
      { status: 500 }
    );
  }
} 