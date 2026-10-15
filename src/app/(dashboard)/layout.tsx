import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
