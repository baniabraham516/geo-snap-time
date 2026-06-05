import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, Loader2 } from "lucide-react";

// Camera-only selfie capture. No gallery upload allowed (anti-manipulasi).
export function SelfieCapture({
  open,
  onOpenChange,
  onCapture,
  title = "Ambil Foto Selfie",
  submitting = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
  submitting?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhoto(null);
      setError(null);
      setReady(false);
      return;
    }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch {
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // mirror to match preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.8));
    stopCamera();
  }

  function retake() {
    setPhoto(null);
    startCamera();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Foto langsung dari kamera depan. Upload dari galeri tidak diperbolehkan.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
          {error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : photo ? (
            <img src={photo} alt="Selfie" className="h-full w-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full -scale-x-100 object-cover"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          {photo ? (
            <>
              <Button variant="outline" className="flex-1" onClick={retake} disabled={submitting}>
                <RefreshCw className="mr-2 h-4 w-4" /> Ulangi
              </Button>
              <Button
                className="flex-1"
                onClick={() => onCapture(photo)}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Gunakan Foto
              </Button>
            </>
          ) : (
            <Button className="flex-1" onClick={takePhoto} disabled={!ready || !!error}>
              <Camera className="mr-2 h-4 w-4" /> Ambil Foto
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
