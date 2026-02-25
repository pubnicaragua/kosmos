'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MapPin, Building2, User, Calendar, Edit, Trash2 } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  industry: string | null
  status: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/clients/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            setError('Cliente no encontrado')
          } else if (response.status === 403) {
            setError('No tienes acceso a este cliente')
          } else {
            setError('Error al cargar el cliente')
          }
          setLoading(false)
          return
        }

        const data = await response.json()
        setClient(data)
      } catch (err) {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchClient()
    }
  }, [params.id, router])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        router.push('/clientes')
      } else {
        alert('Error al eliminar el cliente')
      }
    } catch (err) {
      alert('Error de conexión')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push('/clientes')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Cliente no encontrado'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/clientes')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/clientes?edit=${client.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.name}</h1>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              client.status === 'active' ? 'bg-green-100 text-green-800' :
              client.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {client.status === 'active' ? 'Activo' : client.status === 'inactive' ? 'Inactivo' : 'Prospecto'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {client.email && (
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                  {client.email}
                </a>
              </div>
            </div>
          )}

          {client.phone && (
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                  {client.phone}
                </a>
              </div>
            </div>
          )}

          {client.address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="text-gray-900">{client.address}</p>
                {client.city && <p className="text-gray-600">{client.city}</p>}
                {client.country && <p className="text-gray-600">{client.country}</p>}
              </div>
            </div>
          )}

          {client.industry && (
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Industria</p>
                <p className="text-gray-900">{client.industry}</p>
              </div>
            </div>
          )}

          {client.assignedTo && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Asignado a</p>
                <p className="text-gray-900">{client.assignedTo}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Fecha de creación</p>
              <p className="text-gray-900">
                {new Date(client.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
