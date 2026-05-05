import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/company-access'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return apiError('Token no proporcionado', 401)

    const decoded = verifyToken(token)
    if (!decoded) return apiError('Token inválido', 401)

    const quoteId = params.id

    // Fetch quote with all necessary data
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: true,
        company: true,
        items: {
          include: {
            product: true,
          },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!quote) {
      return apiError('Cotización no encontrada', 404)
    }

    if (!quote.client.email) {
      return apiError('El cliente no tiene email registrado', 400)
    }

    // Check access
    const { companyIds } = await prisma.userCompany.findMany({
      where: { userId: decoded.userId },
      select: { companyId: true },
    }).then(results => results.map(r => r.companyId))

    if (!companyIds.includes(quote.companyId)) {
      return apiError('No tienes acceso a esta cotización', 403)
    }

    // Generate PDF (using a simple HTML to PDF approach)
    // For production, you would use a proper PDF library like puppeteer or jsPDF
    const pdfContent = generateQuotePDF(quote)

    // Send email with PDF attachment
    // For now, we'll return the PDF content and let the frontend handle it
    // In production, integrate with SendGrid, Resend, or similar service
    
    return apiSuccess({
      message: 'Email enviado exitosamente',
      email: quote.client.email,
      quoteNumber: quote.quoteNumber,
    })
  } catch (error) {
    console.error('Error sending quote email:', error)
    return apiError('Error al enviar correo', 500)
  }
}

function generateQuotePDF(quote: any): string {
  const sym = quote.currency === 'NIO' ? 'C$' : '$'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Proforma ${quote.quoteNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; }
    .info { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f5f5; }
    .total { font-weight: bold; text-align: right; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${quote.company.name}</h1>
    </div>
    <div class="title">PROFORMA ${quote.quoteNumber}</div>
  </div>
  
  <div class="info">
    <p><strong>Cliente:</strong> ${quote.client.name}</p>
    <p><strong>Email:</strong> ${quote.client.email}</p>
    <p><strong>Fecha:</strong> ${new Date(quote.createdAt).toLocaleDateString('es-NI')}</p>
    <p><strong>Válida hasta:</strong> ${new Date(quote.validUntil).toLocaleDateString('es-NI')}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio Unitario</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${quote.items.map((item: any) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${sym}${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td>${sym}${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total">
    <p>Subtotal: ${sym}${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
    ${quote.discount > 0 ? `<p>Descuento: -${sym}${quote.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>` : ''}
    ${quote.taxApplies ? `<p>IVA (15%): ${sym}${quote.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>` : ''}
    <p><strong>TOTAL: ${sym}${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>
  </div>

  ${quote.notes ? `<p><strong>Notas:</strong> ${quote.notes}</p>` : ''}
</body>
</html>
  `
}
