'use client'

import { useEffect } from 'react'
import { useWebcam } from '@/hooks/useWebcam'
import { NeonButton } from '@/components/ui/NeonButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Camera, CameraOff, ScanFace } from 'lucide-react'
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
    onCapture(photo ?? '')
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Camera viewport */}
      <div className={clsx(
        'relative w-72 h-72 rounded-3xl overflow-hidden bg-slate-100',
        'border-2 transition-colors',
        isReady ? 'border-brand-300' : 'border-slate-200'
      )}>
        {/* Corner guides */}
        {isReady && !isAnalyzing && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-brand-500 rounded-tl-lg" />
            <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-brand-500 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-brand-500 rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-brand-500 rounded-br-lg" />
          </div>
        )}

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <LoadingSpinner size="lg" color="green" />
            <p className="mt-4 text-brand-600 font-semibold text-sm">Analyzing your style...</p>
          </div>
        )}

        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <CameraOff className="w-12 h-12 mb-3" />
            <p className="text-xs text-center px-4">{error}</p>
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

        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <LoadingSpinner color="green" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-slate-400 text-xs">
        <Camera className="w-3.5 h-3.5" />
        {isReady ? (
          <span className="text-brand-600 font-medium">Camera ready</span>
        ) : error ? (
          <span>Demo mode — no camera needed</span>
        ) : (
          <span>Connecting...</span>
        )}
      </div>

      <NeonButton
        variant="green"
        size="lg"
        onClick={handleCapture}
        disabled={isAnalyzing}
        loading={isAnalyzing}
        className="w-full flex items-center justify-center gap-2"
      >
        <ScanFace className="w-5 h-5" />
        {isAnalyzing ? 'Analyzing...' : 'Start Shopping'}
      </NeonButton>
    </div>
  )
}
