"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { webApi } from "@/lib/webApi";
import { markdownLinkForAttachment } from "@/lib/attachment-utils";
import { generateRecordingFilename, formatDuration } from "@/lib/audio-utils";

interface AudioRecorderProps {
  vaultId: string;
  onInsert: (markdownLink: string) => void;
  onClose: () => void;
}

type RecorderState = "idle" | "requesting" | "recording" | "recorded" | "saving";

/**
 * Web port of desktop/src/components/AudioRecorder.tsx (Phase D8). Desktop
 * writes the recorded blob to the vault's attachments/ folder via
 * electronAPI (base64 data-URL, see desktop/src/lib/audio-utils.ts's
 * module comment on that IPC limitation) — the web version instead uploads
 * the blob straight through the Attachment API (C3, Garage/S3-compatible),
 * which already accepts any mime type, then inserts a markdown link exactly
 * like AttachmentManager.tsx does for any other uploaded file.
 */
export default function AudioRecorder({ vaultId, onInsert, onClose }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const filenameRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      const { width, height } = canvas;
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--bg-surface").trim() || "#313244";
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--accent").trim() || "#89b4fa";
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };
    draw();
  }, []);

  const drawFlatLine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--bg-surface").trim() || "#313244";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--text-muted").trim() || "#6c7086";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    drawFlatLine();
  }, [drawFlatLine]);

  const startRecording = useCallback(async () => {
    setError(null);
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");

        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close().catch(() => {});
      };

      recorder.start(250);

      setElapsed(0);
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 200);

      drawWaveform();
      setState("recording");
      filenameRef.current = generateRecordingFilename();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("Quyền truy cập microphone bị từ chối. Vui lòng cho phép và thử lại.");
      } else {
        setError(`Không thể truy cập microphone: ${msg}`);
      }
      setState("idle");
    }
  }, [drawWaveform]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  }, [state, startRecording, stopRecording]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setPlaybackTime(time);
  }, []);

  useEffect(() => {
    if (!audioUrl || state !== "recorded") return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => setPlaybackDuration(audio.duration));
    audio.addEventListener("timeupdate", () => setPlaybackTime(audio.currentTime));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    });
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl, state]);

  const handleSave = useCallback(async () => {
    if (!blobRef.current) return;
    setState("saving");
    setError(null);
    try {
      const filename = filenameRef.current || generateRecordingFilename();
      const file = new File([blobRef.current], filename, { type: mimeTypeRef.current });
      const attachment = await webApi.attachments.upload(vaultId, file);
      const url = webApi.attachments.downloadUrl(vaultId, attachment.id);
      onInsert(markdownLinkForAttachment(attachment.filename, "audio", url));
      onClose();
    } catch (err) {
      const apiErr = err as { body?: { message?: string } };
      setError(apiErr?.body?.message ?? "Lưu bản ghi âm thất bại — có thể đã vượt hạn mức lưu trữ của vault.");
      setState("recorded");
    }
  }, [vaultId, onInsert, onClose]);

  const handleDiscard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
    setPlaybackTime(0);
    setPlaybackDuration(0);
    setIsPlaying(false);
    setError(null);
    setState("idle");
    drawFlatLine();
  }, [audioUrl, drawFlatLine]);

  const handleClose = useCallback(() => {
    if (state === "recording") stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    onClose();
  }, [state, audioUrl, stopRecording, onClose]);

  return (
    <div className="ar-overlay" onClick={handleClose}>
      <div className="ar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ar-header">
          <span className="ar-title">Ghi âm</span>
          <button className="ar-close-btn" onClick={handleClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="ar-body">
          <canvas ref={canvasRef} className="ar-waveform" />
          <div className="ar-timer">{formatDuration(elapsed)}</div>

          <div className="ar-status">
            <span className={`ar-status-dot${state === "recording" ? " ar-status-dot-recording" : ""}`} />
            <span>
              {state === "idle" && "Sẵn sàng ghi âm"}
              {state === "requesting" && "Đang xin quyền microphone..."}
              {state === "recording" && "Đang ghi âm..."}
              {state === "recorded" && "Đã ghi xong"}
              {state === "saving" && "Đang lưu..."}
            </span>
          </div>

          {(state === "idle" || state === "recording") && (
            <div className="ar-controls">
              <button
                className={`ar-record-btn${state === "recording" ? " ar-record-btn-active" : ""}`}
                onClick={toggleRecording}
                title={state === "recording" ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
              >
                <span className="ar-record-inner" />
              </button>
            </div>
          )}

          {state === "recorded" && audioUrl && (
            <div className="ar-playback">
              <div className="ar-playback-controls">
                <button className="ar-play-btn" onClick={togglePlayback}>
                  {isPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <rect x="3" y="2" width="3" height="10" rx="1" />
                      <rect x="8" y="2" width="3" height="10" rx="1" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M4 2L12 7L4 12V2Z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  className="ar-seek-bar"
                  min={0}
                  max={playbackDuration || 0}
                  step={0.1}
                  value={playbackTime}
                  onChange={handleSeek}
                />
                <span className="ar-playback-time">{formatDuration(playbackTime)}</span>
              </div>
            </div>
          )}

          {error && <div className="ar-error">{error}</div>}
        </div>

        {state === "recorded" && (
          <div className="ar-actions">
            <button className="ar-btn ar-btn-discard" onClick={handleDiscard}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Huỷ
            </button>
            <button className="ar-btn ar-btn-save" onClick={handleSave}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Lưu bản ghi
            </button>
          </div>
        )}

        {state === "saving" && (
          <div className="ar-actions">
            <button className="ar-btn ar-btn-save" disabled>
              Đang lưu...
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
