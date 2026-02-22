import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createWatchlistRepository } from '@/repositories/watchlist-repository'

export async function GET() {
  try {
    const repo = createWatchlistRepository(getDb())
    return NextResponse.json({ success: true, data: repo.findAll() })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json()
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }
    const repo = createWatchlistRepository(getDb())
    const watchlist = repo.create(name)
    return NextResponse.json({ success: true, data: watchlist }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const repo = createWatchlistRepository(getDb())

    // Rename: { id, name }
    if (body.id !== undefined && body.name !== undefined) {
      const watchlist = repo.rename(Number(body.id), body.name)
      return NextResponse.json({ success: true, data: watchlist })
    }

    // Reorder: { order: number[] }
    if (Array.isArray(body.order)) {
      repo.updatePositions(
        body.order.map((id: number, i: number) => ({ id, position: i + 1 }))
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    const repo = createWatchlistRepository(getDb())
    repo.remove(Number(id))
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = String(e)
    const status = msg.includes('last watchlist') ? 400 : 500
    return NextResponse.json({ success: false, error: msg }, { status })
  }
}
