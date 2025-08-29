import { NextRequest, NextResponse } from 'next/server'
import { RMAProcessor } from '@/lib/rma-processor'
import { ProcessRMARequestSchema, PaginationQuerySchema } from '@/lib/schemas'
import { handleAPIError, createLogger, NotFoundError } from '@/lib/errors'

const logger = createLogger('RMA-Process-API')

export async function POST(request: NextRequest) {
  try {
    logger.info('Processing RMA request')
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = ProcessRMARequestSchema.parse(body)
    
    logger.info('Request validated', { rmaNumber: validatedData.rmaNumber })

    const processor = new RMAProcessor()
    const ticket = await processor.processRMATicket(
      validatedData.rmaNumber, 
      validatedData.teamsAccessToken
    )

    logger.info('RMA processed successfully', { rmaNumber: validatedData.rmaNumber })

    return NextResponse.json({
      success: true,
      ticket,
      message: `RMA ${validatedData.rmaNumber} processed successfully`
    })

  } catch (error) {
    logger.error('Failed to process RMA', error)
    return handleAPIError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching RMA tickets')
    
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const validatedQuery = PaginationQuerySchema.parse(queryParams)
    
    const processor = new RMAProcessor()
    
    if (validatedQuery.rma) {
      // Get specific RMA ticket
      logger.info('Fetching specific RMA ticket', { rmaNumber: validatedQuery.rma })
      
      const ticket = await processor.getRMATicket(validatedQuery.rma)
      
      if (!ticket) {
        throw new NotFoundError('RMA ticket')
      }
      
      return NextResponse.json({ ticket })
    } else {
      // Get all RMA tickets with pagination
      logger.info('Fetching RMA tickets with pagination', {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset
      })
      
      const tickets = await processor.getRMATickets(validatedQuery.limit, validatedQuery.offset)
      
      return NextResponse.json({ 
        tickets,
        pagination: {
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
          count: tickets.length,
          hasMore: tickets.length === validatedQuery.limit
        }
      })
    }

  } catch (error) {
    logger.error('Failed to fetch RMA tickets', error)
    return handleAPIError(error)
  }
}
