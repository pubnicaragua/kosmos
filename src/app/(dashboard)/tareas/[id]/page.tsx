'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, CheckCircle2, Camera, MapPin, Clock, 
  AlertCircle, Play, Check, X, Upload, Video
} from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui-kit'

const STATUS_CONFIG: Record<string, any> = {
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  IN_PROGRESS: { label: 'En Progreso', color: 'bg-blue-100 text-blue-700', icon: Play },
  COMPLETED: { label: 'Completada', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
}

export default function TareaDetallePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [assignment, setAssignment] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    fetchAssignment()
  }, [params.id])

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const fetchAssignment = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const res = await fetch(`/api/task-assignments/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setAssignment(data.data)
        
        // Auto-start if pending
        if (data.data.status === 'PENDING') {
          await updateStatus('IN_PROGRESS')
        }
      }
    } catch (error) {
      console.error('Error fetching assignment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      await fetch(`/api/task-assignments/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      await fetchAssignment()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const startCamera = async (executionId: string) => {
    setActiveStep(executionId)
    setIsCapturing(true)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('No se pudo acceder a la cámara. Verifica los permisos.')
      setIsCapturing(false)
    }
  }

  const capturePhoto = async () => {
    if (!canvasRef.current || !videoRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      
      canvas.toBlob(async (blob) => {
        if (!blob) return
        
        // Upload to server
        const formData = new FormData()
        formData.append('file', blob, `evidence-${Date.now()}.jpg`)
        
        const token = localStorage.getItem('accessToken')
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        
        const uploadData = await uploadRes.json()
        if (uploadData.success) {
          await completeExecution(activeStep!, uploadData.data.url)
        }
      }, 'image/jpeg', 0.9)
    }
  }

  const completeExecution = async (executionId: string, photoUrl?: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      // Get location
      let latitude, longitude
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject)
        }).catch(() => null)
        if (position) {
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        }
      }

      const res = await fetch(`/api/task-executions/${executionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completed: true,
          evidencePhotoUrl: photoUrl,
          latitude,
          longitude
        })
      })

      if (res.ok) {
        stopCamera()
        await fetchAssignment()
      }
    } catch (error) {
      console.error('Error completing execution:', error)
      alert('Error al completar el paso')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCapturing(false)
    setActiveStep(null)
  }

  if (isLoading) {
    return <div className="p-8 text-center">Cargando...</div>
  }

  if (!assignment) {
    return <div className="p-8 text-center">Tarea no encontrada</div>
  }

  const StatusIcon = STATUS_CONFIG[assignment.status]?.icon || Clock
  const statusConfig = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.PENDING
  const completedCount = assignment.executions.filter((e: any) => e.completed).length
  const totalCount = assignment.executions.length
  const progress = (completedCount / totalCount) * 100

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/tareas')} className="rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge className={`${statusConfig.color} border-none font-black text-xs px-3 py-1 rounded-full`}>
              <StatusIcon className="w-3 h-3 mr-1.5" />
              {statusConfig.label}
            </Badge>
          </div>
          <h1 className="text-3xl font-black text-slate-900">{assignment.taskList.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{assignment.taskList.description}</p>
        </div>
      </div>

      {/* Progress */}
      <Card className="p-6 border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-slate-600">PROGRESO GENERAL</span>
          <span className="text-2xl font-black text-slate-900">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 text-sm text-slate-500">
          {completedCount} de {totalCount} pasos completados
        </div>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900">Pasos a seguir</h2>
        
        {assignment.executions.map((execution: any, index: number) => {
          const isActive = activeStep === execution.id
          
          return (
            <Card 
              key={execution.id}
              className={`p-6 border-2 transition-all ${
                execution.completed 
                  ? 'border-green-200 bg-green-50/30' 
                  : isActive 
                    ? 'border-blue-400 shadow-lg' 
                    : 'border-slate-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black
                  ${execution.completed 
                    ? 'bg-green-500 text-white' 
                    : 'bg-slate-100 text-slate-400'
                  }
                `}>
                  {execution.completed ? <Check className="w-5 h-5" /> : index + 1}
                </div>

                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 ${
                    execution.completed ? 'text-green-900' : 'text-slate-900'
                  }`}>
                    {execution.template.title}
                  </h3>
                  
                  {execution.template.description && (
                    <p className="text-sm text-slate-600 mb-3">{execution.template.description}</p>
                  )}

                  {execution.completed ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completado {new Date(execution.completedAt).toLocaleString()}</span>
                      </div>
                      
                      {execution.evidencePhotoUrl && (
                        <div className="mt-3">
                          <img 
                            src={execution.evidencePhotoUrl} 
                            alt="Evidencia" 
                            className="w-full max-w-sm rounded-xl border-2 border-green-200"
                          />
                        </div>
                      )}
                      
                      {execution.latitude && execution.longitude && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />
                          <span>Ubicación registrada</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mt-4">
                      {execution.template.requirePhoto ? (
                        <Button
                          onClick={() => startCamera(execution.id)}
                          disabled={isCapturing && activeStep !== execution.id}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Tomar Foto
                        </Button>
                      ) : (
                        <Button
                          onClick={() => completeExecution(execution.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Marcar Completado
                        </Button>
                      )}
                      
                      {execution.template.estimatedMinutes && (
                        <span className="text-xs text-slate-500">
                          ~{execution.template.estimatedMinutes} min
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Camera Modal */}
      {isCapturing && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Capturar Evidencia</h3>
              <Button variant="ghost" onClick={stopCamera} className="rounded-full p-2">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-center gap-4">
              <Button
                onClick={capturePhoto}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                <Camera className="w-5 h-5 mr-2" />
                CAPTURAR
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                CANCELAR
              </Button>
            </div>

            <div className="text-center text-sm text-slate-500">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              La foto se tomará directamente desde la cámara
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
