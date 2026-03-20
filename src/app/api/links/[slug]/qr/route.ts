import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const shortUrl = `${baseUrl}/${slug}`
  
  const qrDataUrl = await QRCode.toDataURL(shortUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  })
  
  return NextResponse.json({ qr: qrDataUrl })
}
