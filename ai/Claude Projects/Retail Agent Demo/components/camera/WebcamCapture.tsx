'use client'

import { useEffect } from 'react'
import { useWebcam } from '@/hooks/useWebcam'
import { NeonButton } from '@/components/ui/NeonButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Camera, CameraOff } from 'lucide-react'
import { clsx } from 'clsx'

interface WebcamCaptureProps {
  onCapture: (base64: string) => void
  isAnalyzing: boolean
}

export function WebcamCapture({ onCapture, isAnalyzing }: WebcamCaptureProps) {
  const { videoRef, isReady, error, startCamera, stopCamera, capturePhoto } = useWebcam()

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  const handleCapture = () => {
    const photo = capturePhoto()
    if (photo) {
      onCapture(photo)
    } else {
      // Demo fallback: send empty string to get default persona
      onCapture('')
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Camera viewport */}
      <div className={clsx(
        'relative w-72 h-72 rounded-2xl overflow-hidden',
        'border-2',
        isReady ? 'border-neon-green/50 shadow-[0_0_30px_rgba(57,255,20,0.2)]' : 'border-white/20'
      )}>
        {/* Scanning overlay */}
        {isReady && !isAnalyzing && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-neon-green" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-neon-green" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-neon-green" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-neon-green" />
          </div>
        )}

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <LoadingSpinner size="lg" color="green" />
            <p className="mt-4 text-neon-green font-mono text-sm animate-pulse">SCANNING...</p>
          </div>
        )}

        {/* Video feed or placeholder */}
        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 text-white/40">
            <CameraOff className="w-12 h-12 mb-3" />
            <p className="text-xs font-mono text-center px-4">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}

        {/* Loading state */}
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <LoadingSpinner color="green" />
          </div>
        )}
      </div>

      {/* Camera icon badge */}
      <div className="flex items-center gap-2 text-white/40 text-xs font-mono">
        <Camera className="w-3.5 h-3.5" />
        {isReady ? (
          <span className="text-neon-green/80">Camera ready</span>
        ) : error ? (
          <span>Demo mode active</span>
        ) : (
          <span>Connecting camera...</span>
        )}
      </div>

      {/* CTA Button */}
      <NeonButton
        variant="green"
        size="lg"
        onClick={handleCapture}
        disabled={isAnalyzing}
        loading={isAnalyzing}
      >
        {isAnalyzing ? 'ANALYZING...' : 'START SHOPPING →'}
      </NeonButton>
    </div>
  )
}
