'use client'

import { useState } from 'react'
import { QrCode, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface QRModalProps {
  slug: string
  url: string
}

export default function QRModal({ slug, url }: QRModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  const shortUrl = `${baseUrl}/${slug}`

  const fetchQR = async () => {
    if (qrDataUrl) return // already have it
    setLoading(true)
    try {
      const res = await fetch(`/api/links/${slug}/qr`)
      const data = await res.json()
      if (data.qr) setQrDataUrl(data.qr)
    } catch (err) {
      console.error('Failed to fetch QR:', err)
    } finally {
      setLoading(false)
    }
  }

  const open = () => {
    setIsOpen(true)
    fetchQR()
  }

  const downloadQR = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${slug}.png`
    a.click()
  }

  if (!isOpen) {
    return (
      <button
        onClick={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title="Show QR code"
      >
        <QrCode className="w-3 h-3" />
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-card border-border shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* QR Code */}
            <div className="flex flex-col items-center">
              {loading ? (
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <span className="animate-pulse text-muted-foreground">Loading...</span>
                </div>
              ) : qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR code for ${slug}`}
                  className="w-48 h-48 rounded-lg border"
                />
              ) : (
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Failed to load</span>
                </div>
              )}
              
              {/* Short URL */}
              <p className="mt-3 font-mono text-sm text-muted-foreground break-all text-center">
                {shortUrl}
              </p>
              
              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadQR}
                  disabled={!qrDataUrl}
                  className="gap-1.5"
                >
                  <Download className="w-3 h-3" /> Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(shortUrl)
                  }}
                  className="gap-1.5"
                >
                  Copy URL
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
