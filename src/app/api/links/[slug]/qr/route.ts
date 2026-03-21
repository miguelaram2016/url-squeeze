import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export interface QRCodeOptions {
  logo?: boolean
  color?: string
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  
  const options: QRCodeOptions = {
    logo: searchParams.get('logo') !== 'false',
    color: searchParams.get('color') || '#000000'
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const shortUrl = `${baseUrl}/${slug}`
  
  // Generate QR as SVG string
  const svgString = await QRCode.toString(shortUrl, {
    type: 'svg',
    width: 400,
    margin: 2,
    color: { dark: options.color, light: '#ffffff' }
  })
  
  let finalSvg: string
  
  if (options.logo) {
    // Logo/branding: circle with "QS" in center
    // Subtle size — 18% of 400 = 72px diameter, doesn't break QR scannability
    const logoDiameter = 72
    const centerX = 200
    const centerY = 200
    const radius = logoDiameter / 2
    const ringWidth = 6
    const fontSize = Math.round(logoDiameter * 0.38)
    const color = options.color ?? '#000000'
    
    // White circle to clear QR modules in center
    const logoGroup = `
  <g>
    <!-- White background circle -->
    <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="white"/>
    <!-- Colored ring -->
    <circle cx="${centerX}" cy="${centerY}" r="${radius - ringWidth / 2}" 
            fill="white" stroke="${color}" stroke-width="${ringWidth}"/>
    <!-- "QS" text -->
    <text x="${centerX}" y="${centerY}" 
          font-family="sans-serif" font-weight="bold" font-size="${fontSize}" 
          fill="${color}" text-anchor="middle" dominant-baseline="central">QS</text>
  </g>`
    
    // Inject branding into SVG before closing </svg> tag
    finalSvg = svgString.replace('</svg>', `${logoGroup}</svg>`)
  } else {
    finalSvg = svgString
  }
  
  // Return as data URL so existing consumers still get JSON { qr: dataUrl }
  const svgBase64 = Buffer.from(finalSvg).toString('base64')
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`
  
  return NextResponse.json({ qr: dataUrl })
}
