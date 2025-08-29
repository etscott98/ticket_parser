import { NextRequest, NextResponse } from 'next/server'
import { RMAProcessor } from '@/lib/rma-processor'

export async function POST(request: NextRequest) {
  try {
    const { rmaNumber, teamsAccessToken } = await request.json()

    if (!rmaNumber) {
      return NextResponse.json(
        { error: 'RMA number is required' },
        { status: 400 }
      )
    }

    // Validate RMA number format (adjust regex as needed)
    if (!/^\d+$/.test(rmaNumber.toString())) {
      return NextResponse.json(
        { error: 'Invalid RMA number format' },
        { status: 400 }
      )
    }

    const processor = new RMAProcessor()
    const ticket = await processor.processRMATicket(rmaNumber.toString(), teamsAccessToken)

    return NextResponse.json({
      success: true,
      ticket,
      message: `RMA ${rmaNumber} processed successfully`
    })

  } catch (error) {
    console.error('API Error processing RMA:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process RMA ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const rmaNumber = url.searchParams.get('rma')
    
    const processor = new RMAProcessor()
    
    if (rmaNumber) {
      // Get specific RMA ticket
      const ticket = await processor.getRMATicket(rmaNumber)
      
      if (!ticket) {
        return NextResponse.json(
          { error: 'RMA ticket not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ ticket })
    } else {
      // Get all RMA tickets with pagination
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      
      const tickets = await processor.getRMATickets(limit, offset)
      
      return NextResponse.json({ 
        tickets,
        pagination: {
          limit,
          offset,
          count: tickets.length
        }
      })
    }

  } catch (error) {
    console.error('API Error fetching RMA tickets:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch RMA tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
