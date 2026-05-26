'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Camera, Clock, Save, ListChecks } from 'lucide-react'
import { Button, Card, Input, Select } from '@/components/ui-kit'
import { useCompany } from '@/hooks/useCompany'

interface TemplateStep {
  tempId: number
  title: string
  description: string
  requirePhoto: boolean
  requireVideo: boolean
  estimatedMinutes: number | null
}

export default function NuevaRutinaPage() {
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area: '',
    frequency: 'DAILY',
    requireEvidence: false
  })
  const [steps, setSteps] = useState<TemplateStep[]>([
    {
      tempId: Date.now(),
      title: '',
      description: '',
      requirePhoto: false,
      requireVideo: false,
      estimatedMinutes: null
    }
  ])

  const addStep = () => {
    setSteps([...steps, {
      tempId: Date.now(),
      title: '',
      description: '',
      requirePhoto: false,
      requireVideo: false,
      estimatedMinutes: null
    }])
  }

  const removeStep = (tempId: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter(s => s.tempId !== tempId))
    }
  }

  const updateStep = (tempId: number, field: keyof TemplateStep, value: any) => {
    setSteps(steps.map(s => s.tempId === tempId ? { ...s, [field]: value } : s))
  }

  const handleSubmit = async () => {
    if (!formData.name || steps.some(s => !s.title)) {
      alert('Completa el nombre de la rutina y todos los pasos')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/task-lists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: selectedCompany,
          ...formData,
          templates: steps.map(s => ({
            title: s.title,
            description: s.description,
            requirePhoto: s.requirePhoto,
            requireVideo: s.requireVideo,
            estimatedMinutes: s.estimatedMinutes
          }))
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('Rutina creada exitosamente')
        router.push('/tareas?view=lists')
      } else {
        alert(data.error || 'Error al crear rutina')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear rutina')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/tareas')} className="rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Nueva Rutina</h1>
          <p className="text-sm text-slate-500 mt-1">Crea una lista de tareas reutilizable para tu equipo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-slate-100 space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              Información General
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nombre de la Rutina *</label>
              <Input
                placeholder="ej: Limpieza de Cocina, Apertura de Tienda..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Descripción</label>
              <textarea
                className="w-full rounded-xl border-2 border-slate-100 p-4 text-sm focus:border-blue-500 focus:outline-none min-h-[80px]"
                placeholder="Describe el propósito de esta rutina..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Área</label>
                <Input
                  placeholder="ej: Cocina, Sala, Caja..."
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Frecuencia</label>
                <Select
                  options={[
                    { value: 'DAILY', label: 'Diaria' },
                    { value: 'WEEKLY', label: 'Semanal' },
                    { value: 'MONTHLY', label: 'Mensual' },
                    { value: 'CUSTOM', label: 'Personalizada' }
                  ]}
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  fullWidth
                  className="rounded-xl"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer group hover:bg-blue-100 transition-all">
              <input
                type="checkbox"
                checked={formData.requireEvidence}
                onChange={(e) => setFormData({ ...formData, requireEvidence: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-blue-300"
              />
              <div>
                <p className="font-bold text-blue-900">Requiere Evidencia Fotográfica</p>
                <p className="text-xs text-blue-700">Al menos un paso debe incluir foto o video como evidencia</p>
              </div>
            </label>
          </Card>

          <Card className="p-8 border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Pasos de la Rutina</h3>
              <Button onClick={addStep} variant="outline" className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Paso
              </Button>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.tempId} className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 relative group">
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(step.tempId)}
                      className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">
                      {index + 1}
                    </div>
                    <h4 className="font-bold text-slate-700">Paso {index + 1}</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Título *</label>
                      <Input
                        placeholder="ej: Limpiar mesas, Verificar stock..."
                        value={step.title}
                        onChange={(e) => updateStep(step.tempId, 'title', e.target.value)}
                        className="rounded-xl font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Descripción (opcional)</label>
                      <textarea
                        className="w-full rounded-xl border-2 border-slate-100 p-3 text-sm focus:border-blue-500 focus:outline-none min-h-[60px]"
                        placeholder="Instrucciones detalladas..."
                        value={step.description}
                        onChange={(e) => updateStep(step.tempId, 'description', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-slate-100 cursor-pointer hover:border-blue-300 transition-all">
                        <input
                          type="checkbox"
                          checked={step.requirePhoto}
                          onChange={(e) => updateStep(step.tempId, 'requirePhoto', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Camera className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">Foto</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-slate-100 cursor-pointer hover:border-blue-300 transition-all">
                        <input
                          type="checkbox"
                          checked={step.requireVideo}
                          onChange={(e) => updateStep(step.tempId, 'requireVideo', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Camera className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">Video</span>
                      </label>

                      <div className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-slate-100">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="min"
                          value={step.estimatedMinutes || ''}
                          onChange={(e) => updateStep(step.tempId, 'estimatedMinutes', parseInt(e.target.value) || null)}
                          className="text-xs w-full border-none p-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white sticky top-8">
            <h3 className="text-lg font-black mb-4">Resumen</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between opacity-90">
                <span>Pasos totales:</span>
                <span className="font-black">{steps.length}</span>
              </div>
              <div className="flex justify-between opacity-90">
                <span>Con foto:</span>
                <span className="font-black">{steps.filter(s => s.requirePhoto).length}</span>
              </div>
              <div className="flex justify-between opacity-90">
                <span>Tiempo estimado:</span>
                <span className="font-black">
                  {steps.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0)} min
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/20 space-y-3">
              <Button
                onClick={handleSubmit}
                disabled={isSaving || !formData.name}
                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl"
              >
                {isSaving ? 'GUARDANDO...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    GUARDAR RUTINA
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/tareas')}
                className="w-full text-white border-white/30 hover:bg-white/10 rounded-xl"
              >
                CANCELAR
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-amber-50 border-amber-100 text-xs">
            <div className="flex gap-2">
              <Camera className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-900 leading-relaxed">
                <strong>Evidencia obligatoria:</strong> Las fotos/videos se toman directamente desde la cámara.
                No se permite subir desde galería para garantizar autenticidad.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
