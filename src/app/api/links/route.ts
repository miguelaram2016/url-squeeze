import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const links = await prisma.link.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { clickRecords: true } } }
  })
  
  return NextResponse.json(links)
}

export async function POST(req: Request) {
  const { url, slug } = await req.json()
  
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
  
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  
  const finalSlug = slug || nanoid(6)
  
  const existing = await prisma.link.findUnique({ where: { slug: finalSlug } })
  if (existing) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }
  
  const link = await prisma.link.create({
    data: { slug: finalSlug, url }
  })
  
  return NextResponse.json(link)
}
