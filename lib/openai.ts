import OpenAI from 'openai'

interface ReasonAnalysis {
  primaryReason: string
  specificIssue: string
  customerImpact: string
  timeline: string
  additionalNotes: string
}

export class OpenAIService {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }

  async analyzeTicketForReason(ticketText: string): Promise<ReasonAnalysis> {
    const systemPrompt = `You are an expert at analyzing customer support tickets for product returns (RMAs). 

Your task is to analyze the ticket and provide detailed, organized information about the return reason.

Format your response as organized information with these sections:

**PRIMARY REASON:** [Main category - one of: Product Defect, Wrong Item, Quality Issue, Installation Problem, Customer Decision, Shipping Damage, Warranty Claim, Other]

**SPECIFIC ISSUE:** [Detailed description of the actual problem]

**CUSTOMER IMPACT:** [How this affected the customer]

**TIMELINE:** [When the issue occurred, if mentioned]

**ADDITIONAL NOTES:** [Any other relevant details, troubleshooting attempted, etc.]

Example format:
**PRIMARY REASON:** Product Defect
**SPECIFIC ISSUE:** Gas valve failure preventing pilot light from staying lit after multiple relight attempts
**CUSTOMER IMPACT:** Complete loss of hot water for household 
**TIMELINE:** Started 3 months after installation
**ADDITIONAL NOTES:** Customer followed manual troubleshooting, unit under warranty

Analyze the entire ticket content including subject, description, and conversations. If information is missing for any section, write "Not specified" for that section.

If the ticket doesn't contain clear return information, respond with:
**PRIMARY REASON:** Unable to Determine
**SPECIFIC ISSUE:** Insufficient information in ticket content
**CUSTOMER IMPACT:** Not specified  
**TIMELINE:** Not specified
**ADDITIONAL NOTES:** Ticket may not be related to a product return`

    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this RMA ticket and determine the primary reason for return:\n\n${ticketText}`
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })

      const content = response.choices[0]?.message?.content?.trim()
      
      if (!content) {
        throw new Error('OpenAI returned empty response')
      }

      return this.parseAIResponse(content)
    } catch (error) {
      console.error('OpenAI API error:', error)
      
      // Return structured fallback
      return {
        primaryReason: 'API Error',
        specificIssue: `OpenAI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        customerImpact: 'Not specified',
        timeline: 'Not specified',
        additionalNotes: 'Manual review required due to AI analysis failure'
      }
    }
  }

  private parseAIResponse(response: string): ReasonAnalysis {
    const result: ReasonAnalysis = {
      primaryReason: '',
      specificIssue: '',
      customerImpact: '',
      timeline: '',
      additionalNotes: ''
    }

    const lines = response.split('\n')
    let currentField: keyof ReasonAnalysis | null = null

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Check for field headers
      if (trimmedLine.startsWith('**PRIMARY REASON:**')) {
        currentField = 'primaryReason'
        result.primaryReason = trimmedLine.replace('**PRIMARY REASON:**', '').trim()
      } else if (trimmedLine.startsWith('**SPECIFIC ISSUE:**')) {
        currentField = 'specificIssue'
        result.specificIssue = trimmedLine.replace('**SPECIFIC ISSUE:**', '').trim()
      } else if (trimmedLine.startsWith('**CUSTOMER IMPACT:**')) {
        currentField = 'customerImpact'
        result.customerImpact = trimmedLine.replace('**CUSTOMER IMPACT:**', '').trim()
      } else if (trimmedLine.startsWith('**TIMELINE:**')) {
        currentField = 'timeline'
        result.timeline = trimmedLine.replace('**TIMELINE:**', '').trim()
      } else if (trimmedLine.startsWith('**ADDITIONAL NOTES:**')) {
        currentField = 'additionalNotes'
        result.additionalNotes = trimmedLine.replace('**ADDITIONAL NOTES:**', '').trim()
      } else if (currentField && trimmedLine) {
        // Continue multi-line content
        if (result[currentField]) {
          result[currentField] += ' ' + trimmedLine
        } else {
          result[currentField] = trimmedLine
        }
      }
    }

    return result
  }
}
