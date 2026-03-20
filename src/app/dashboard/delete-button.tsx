'use client'

import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteLinkButton({ linkId }: { linkId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Delete this link?')) return
    setLoading(true)
    await fetch(`/api/links/${linkId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:text-red-500"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="w-3 h-3" />
    </Button>
  )
}
