'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => setIsReady(true)
      }
    } catch (err) {
      setError('Camera access denied. Using demo mode.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setIsReady(false)
    }
  }, [stream])

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isReady) return null

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    // Strip the data:image/jpeg;base64, prefix
    return dataUrl.split(',')[1] ?? null
  }, [isReady])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return { videoRef, stream, isReady, error, startCamera, stopCamera, capturePhoto }
}
