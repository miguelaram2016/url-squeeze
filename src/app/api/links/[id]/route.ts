import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth()
  const { id } = await params
  await prisma.link.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth()
  const { id } = await params
  const data = await req.json()
  const link = await prisma.link.update({ where: { id }, data })
  return NextResponse.json(link)
}
