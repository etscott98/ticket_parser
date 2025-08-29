# RMA Management System

A modern web application for automated RMA (Return Merchandise Authorization) ticket processing with Freshdesk integration and AI-powered analysis.

## Features

- 🎯 **Automated Processing**: Enter an RMA number and get complete ticket analysis
- 🤖 **AI-Powered Analysis**: Structured return reason analysis using OpenAI
- 📊 **Rich Data Extraction**: Customer info, device IDs, status mapping
- 🔄 **Real-time Updates**: Live processing status with persistent storage
- 📱 **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- 🗄️ **Supabase Backend**: Reliable PostgreSQL database with real-time capabilities

## Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and Shadcn/ui components
- **Backend**: Next.js API routes with server-side processing
- **Database**: Supabase (PostgreSQL) for persistent storage
- **Integrations**: Freshdesk API for ticket data, OpenAI for analysis
- **Deployment**: Vercel for hosting and deployment

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd rma-management-system
npm install
```

### 2. Environment Configuration

Copy `env.example` to `.env.local` and fill in your credentials:

```bash
cp env.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Freshdesk
FRESHDESK_SUBDOMAIN=your_freshdesk_subdomain
FRESHDESK_API_KEY=your_freshdesk_api_key
VIDS_FIELD_KEY=cf_vids_associated

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the schema from `supabase-schema.sql` to create the required tables
4. Get your project URL and API keys from Project Settings > API

### 4. Freshdesk Configuration

1. Get your Freshdesk subdomain (e.g., `yourcompany.freshdesk.com` → use `yourcompany`)
2. Generate an API key from Admin > Profile > View Contact > API Key
3. Ensure your custom VIDs field key matches `VIDS_FIELD_KEY` (default: `cf_vids_associated`)

### 5. OpenAI Setup

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Ensure you have sufficient credits/quota for API usage
3. Recommended model: `gpt-4o-mini` for cost-effective analysis

### 6. Local Development

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### 7. Deployment to Vercel

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add all environment variables in Vercel Project Settings > Environment Variables
4. Deploy!

## Usage

### Processing an RMA Ticket

1. Enter an RMA number in the form
2. Click "Process RMA" 
3. The system will:
   - Fetch the ticket from Freshdesk
   - Extract customer information and device IDs
   - Analyze the ticket content with AI
   - Store results in Supabase
   - Display organized results

### Viewing Results

The processed ticket displays:

- **Customer Information**: Name and email from requester
- **Device IDs (VIDs)**: Automatically extracted 10-digit device identifiers
- **Return Analysis**: 
  - Primary Reason (categorized)
  - Specific Issue (detailed description)
  - Customer Impact (effect on customer)
  - Timeline (when issue occurred)
  - Additional Notes (extra details)

### Recent Tickets

View recently processed tickets in the sidebar with:
- Processing status indicators
- Quick access to view details
- Status badges (Open, Pending, Resolved, etc.)

## API Endpoints

### `POST /api/rma/process`
Process a new RMA ticket
```json
{
  "rmaNumber": "23526"
}
```

### `GET /api/rma/process`
Get all processed tickets (with pagination)
```
/api/rma/process?limit=50&offset=0
```

### `GET /api/rma/process?rma=12345`
Get specific RMA ticket
```
/api/rma/process?rma=23526
```

### `GET /api/rma/[rmaNumber]`
Get specific RMA ticket by number
```
/api/rma/23526
```

### `DELETE /api/rma/[rmaNumber]`
Delete an RMA ticket
```
DELETE /api/rma/23526
```

## Development

### Project Structure

```
├── app/                    # Next.js 14 app directory
│   ├── api/rma/           # API routes for RMA processing
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── rma-form.tsx      # RMA processing form
│   └── rma-ticket-display.tsx # Ticket display component
├── lib/                   # Utility libraries
│   ├── database.types.ts  # TypeScript types for database
│   ├── freshdesk.ts      # Freshdesk API service
│   ├── openai.ts         # OpenAI API service
│   ├── rma-processor.ts  # Main processing logic
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # General utilities
├── supabase-schema.sql    # Database schema
└── env.example           # Environment variables template
```

### Key Services

- **FreshdeskService**: Handles ticket fetching, device ID extraction, status mapping
- **OpenAIService**: Manages AI analysis with structured prompts
- **RMAProcessor**: Orchestrates the complete processing pipeline
- **Supabase**: Database operations and real-time updates

## Troubleshooting

### Common Issues

1. **"Freshdesk authentication failed"**
   - Check FRESHDESK_SUBDOMAIN and FRESHDESK_API_KEY
   - Verify API key has proper permissions

2. **"OpenAI quota exceeded"**
   - Check your OpenAI billing and usage
   - Ensure sufficient credits

3. **"Database connection failed"**
   - Verify Supabase URL and keys
   - Check if database schema was applied

4. **"Ticket not found"**
   - Verify RMA number exists in Freshdesk
   - Check if ticket is accessible with your API key

### Environment Variables

Make sure all required environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRESHDESK_SUBDOMAIN`
- `FRESHDESK_API_KEY`
- `OPENAI_API_KEY`

## Migration from Python Script

This application replaces the Excel-based Python script with:

✅ **Web Interface** instead of command line  
✅ **Database Storage** instead of Excel files  
✅ **Real-time Processing** instead of batch processing  
✅ **Cloud Deployment** instead of local execution  
✅ **Modern UI** instead of command output  

The core functionality (Freshdesk integration, AI analysis, device ID extraction) remains the same but now operates in a web-based environment with persistent storage.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Your License Here]