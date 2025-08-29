import { NextRequest, NextResponse } from 'next/server'
import { RMAProcessor } from '@/lib/rma-processor'

export async function GET(
  request: NextRequest,
  { params }: { params: { rmaNumber: string } }
) {
  try {
    const { rmaNumber } = params

    const processor = new RMAProcessor()
    const ticket = await processor.getRMATicket(rmaNumber)

    if (!ticket) {
      return NextResponse.json(
        { error: 'RMA ticket not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ticket })

  } catch (error) {
    console.error('API Error fetching RMA ticket:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch RMA ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { rmaNumber: string } }
) {
  try {
    const { rmaNumber } = params

    const processor = new RMAProcessor()
    await processor.deleteRMATicket(rmaNumber)

    return NextResponse.json({ 
      success: true,
      message: `RMA ${rmaNumber} deleted successfully`
    })

  } catch (error) {
    console.error('API Error deleting RMA ticket:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to delete RMA ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
