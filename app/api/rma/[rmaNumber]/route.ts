import { NextRequest, NextResponse } from 'next/server'
import { RMAProcessor } from '@/lib/rma-processor'
import { RMANumberParamSchema } from '@/lib/schemas'
import { handleAPIError, createLogger, NotFoundError } from '@/lib/errors'

const logger = createLogger('RMA-Detail-API')

export async function GET(
  request: NextRequest,
  { params }: { params: { rmaNumber: string } }
) {
  try {
    logger.info('Fetching specific RMA ticket')
    
    // Validate route parameter
    const validatedParams = RMANumberParamSchema.parse(params)
    
    logger.info('Fetching RMA ticket', { rmaNumber: validatedParams.rmaNumber })

    const processor = new RMAProcessor()
    const ticket = await processor.getRMATicket(validatedParams.rmaNumber)

    if (!ticket) {
      throw new NotFoundError('RMA ticket')
    }

    logger.info('RMA ticket found', { rmaNumber: validatedParams.rmaNumber })
    return NextResponse.json({ ticket })

  } catch (error) {
    logger.error('Failed to fetch RMA ticket', error)
    return handleAPIError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { rmaNumber: string } }
) {
  try {
    logger.info('Deleting RMA ticket')
    
    // Validate route parameter
    const validatedParams = RMANumberParamSchema.parse(params)
    
    logger.info('Deleting RMA ticket', { rmaNumber: validatedParams.rmaNumber })

    const processor = new RMAProcessor()
    await processor.deleteRMATicket(validatedParams.rmaNumber)

    logger.info('RMA ticket deleted successfully', { rmaNumber: validatedParams.rmaNumber })

    return NextResponse.json({ 
      success: true,
      message: `RMA ${validatedParams.rmaNumber} deleted successfully`
    })

  } catch (error) {
    logger.error('Failed to delete RMA ticket', error)
    return handleAPIError(error)
  }
}
