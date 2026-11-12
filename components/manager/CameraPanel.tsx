'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type CameraState = 'off' | 'starting' | 'active' | 'denied' | 'error';

export function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>('off');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState('off');
    setErrorDetail(null);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (state === 'active' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [state]);

  async function startCamera() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setErrorDetail('Camera API is unavailable in this browser or context.');
      return;
    }

    setState('starting');
    setErrorDetail(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setState('active');
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setState('denied');
      } else {
        setState('error');
        setErrorDetail(
          err instanceof Error ? err.message : 'Unable to access the camera.'
        );
      }
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-text">Canteen Floor Camera</h2>
          <p className="text-xs text-muted">
            Local browser preview only. No video is recorded or uploaded.
          </p>
        </div>

        {state === 'active' ? (
          <Button variant="secondary" onClick={stopCamera}>
            <CameraOff className="h-4 w-4" aria-hidden="true" />
            Stop camera
          </Button>
        ) : (
          <Button onClick={startCamera} loading={state === 'starting'}>
            <Camera className="h-4 w-4" aria-hidden="true" />
            Start camera
          </Button>
        )}
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-bg">
        {state === 'active' ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
              LIVE &middot; not recorded
            </span>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            {state === 'starting' && (
              <p className="text-sm font-medium text-muted">Starting camera&hellip;</p>
            )}
            {state === 'off' && (
              <>
                <Video className="mb-2 h-8 w-8 text-muted" aria-hidden="true" />
                <p className="text-sm font-medium text-text">Camera is off</p>
                <p className="mt-1 text-xs text-muted">
                  Click Start camera to preview the canteen floor.
                </p>
              </>
            )}
            {state === 'denied' && (
              <div className="max-w-sm space-y-2 text-left">
                <p className="text-sm font-semibold text-danger">Camera access blocked</p>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted">
                  <li>Click the camera or lock icon in your browser address bar.</li>
                  <li>Set Camera permission to Allow for this site.</li>
                  <li>Click Start camera again.</li>
                </ol>
              </div>
            )}
            {state === 'error' && (
              <div className="max-w-sm space-y-1">
                <p className="text-sm font-semibold text-danger">Camera unavailable</p>
                <p className="text-xs text-muted">{errorDetail}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
