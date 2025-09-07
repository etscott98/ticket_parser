# Azure Function Deployment Guide

## 🎯 Overview

This guide will help you deploy your RMA Management System to Azure Functions with GitHub integration for continuous deployment.

## ⚠️ Important Note

Your current application is a **Next.js web application**, which is different from Azure Functions. You have two options:

### Option 1: Deploy as a Web App (Recommended)
Deploy the entire Next.js application to **Azure App Service** or **Azure Static Web Apps** (better for Next.js)

### Option 2: Extract Core Logic to Azure Functions
Create separate Azure Functions for the core processing logic while keeping the UI separate

---

## 🚀 Option 1: Deploy Next.js to Azure Static Web Apps (Recommended)

### Prerequisites
- Azure account
- GitHub repository with your code
- Azure CLI installed (optional)

### Step 1: Push Code to GitHub
```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

### Step 2: Create Azure Static Web App

#### Via Azure Portal:
1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Static Web App"
4. Click "Create"
5. Fill in:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new or use existing
   - **Name**: `rma-management-system`
   - **Region**: Choose closest to you
   - **SKU**: Free
   - **Source**: GitHub
   - **GitHub Account**: Sign in and authorize
   - **Organization**: Your GitHub username
   - **Repository**: Your repo name
   - **Branch**: main
   - **Build Presets**: Next.js
   - **App location**: `/`
   - **Api location**: Leave empty
   - **Output location**: `.next`

6. Click "Review + create" then "Create"

### Step 3: Configure Environment Variables
1. In Azure Portal, go to your Static Web App
2. Go to "Configuration" → "Application settings"
3. Add all your environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   FRESHDESK_SUBDOMAIN
   FRESHDESK_API_KEY
   OPENAI_API_KEY
   NEXT_PUBLIC_MICROSOFT_CLIENT_ID
   NEXT_PUBLIC_MICROSOFT_TENANT_ID
   MICROSOFT_CLIENT_SECRET
   ```

### Step 4: Update Build Configuration
Create `.github/workflows/azure-static-web-apps-*.yml` (auto-generated):
```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
      
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: ".next"
```

---

## 🔧 Option 2: Extract Core Logic to Azure Functions

If you specifically need Azure Functions, here's how to extract your core logic:

### Step 1: Create Azure Function Project

Create a new folder `azure-functions` in your project:

```bash
mkdir azure-functions
cd azure-functions
```

### Step 2: Initialize Function App
```bash
func init --typescript
```

### Step 3: Create HTTP Trigger Function
```bash
func new --name TicketParser --template "HTTP trigger"
```

### Step 4: Extract Core Logic

Create `TicketParser/index.ts`:
```typescript
import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { z } from 'zod'

// Copy your services here or create simplified versions
import { FreshdeskService } from '../lib/freshdesk'
import { OpenAIService } from '../lib/openai'
import { TeamsService } from '../lib/teams'

const RequestSchema = z.object({
  rmaNumber: z.string().optional(),
  deviceId: z.string().optional(),
  action: z.enum(['processRMA', 'searchTeams'])
})

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log('TicketParser function processed a request.')

  try {
    const input = RequestSchema.parse(req.body)

    if (input.action === 'processRMA' && input.rmaNumber) {
      // Process RMA logic
      const freshdeskService = new FreshdeskService(
        process.env.FRESHDESK_SUBDOMAIN!,
        process.env.FRESHDESK_API_KEY!
      )
      
      const ticket = await freshdeskService.getTicket(input.rmaNumber)
      
      // Add your processing logic here
      
      context.res = {
        status: 200,
        body: {
          success: true,
          data: ticket
        }
      }
    } else if (input.action === 'searchTeams' && input.deviceId) {
      // Teams search logic
      context.res = {
        status: 200,
        body: {
          success: true,
          message: "Teams search would go here"
        }
      }
    } else {
      context.res = {
        status: 400,
        body: {
          success: false,
          error: "Invalid action or missing parameters"
        }
      }
    }
  } catch (error) {
    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message
      }
    }
  }
}

export default httpTrigger
```

### Step 5: Configure Function App
Update `host.json`:
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.*, 4.0.0)"
  }
}
```

### Step 6: Local Settings
Create `local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FRESHDESK_SUBDOMAIN": "your-subdomain",
    "FRESHDESK_API_KEY": "your-api-key",
    "OPENAI_API_KEY": "your-openai-key",
    "NEXT_PUBLIC_MICROSOFT_CLIENT_ID": "your-client-id",
    "NEXT_PUBLIC_MICROSOFT_TENANT_ID": "your-tenant-id",
    "MICROSOFT_CLIENT_SECRET": "your-client-secret"
  }
}
```

### Step 7: Deploy to Azure

#### Create Function App in Azure:
```bash
# Login to Azure
az login

# Create resource group
az group create --name rma-functions-rg --location eastus

# Create storage account
az storage account create --name rmafuncstorage --location eastus --resource-group rma-functions-rg --sku Standard_LRS

# Create function app
az functionapp create --resource-group rma-functions-rg --consumption-plan-location eastus --runtime node --runtime-version 18 --functions-version 4 --name rma-ticket-parser --storage-account rmafuncstorage
```

#### Deploy via GitHub Actions:

Create `.github/workflows/azure-functions.yml`:
```yaml
name: Deploy Azure Function

on:
  push:
    branches: [ main ]
    paths:
      - 'azure-functions/**'

env:
  AZURE_FUNCTIONAPP_NAME: rma-ticket-parser
  AZURE_FUNCTIONAPP_PACKAGE_PATH: './azure-functions'
  NODE_VERSION: '18.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: 'Checkout GitHub Action'
      uses: actions/checkout@v3

    - name: Setup Node ${{ env.NODE_VERSION }} Environment
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}

    - name: 'Install dependencies'
      shell: bash
      run: |
        pushd './${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}'
        npm install
        npm run build --if-present
        npm run test --if-present
        popd

    - name: 'Run Azure Functions Action'
      uses: Azure/functions-action@v1
      with:
        app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
        package: ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
        publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

#### Get Publish Profile:
1. Go to Azure Portal
2. Navigate to your Function App
3. Click "Get publish profile"
4. Add as GitHub secret named `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`

### Step 8: Configure Function App Settings
```bash
# Set environment variables
az functionapp config appsettings set --name rma-ticket-parser --resource-group rma-functions-rg --settings \
  "FRESHDESK_SUBDOMAIN=your-subdomain" \
  "FRESHDESK_API_KEY=your-api-key" \
  "OPENAI_API_KEY=your-openai-key" \
  "NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-client-id" \
  "NEXT_PUBLIC_MICROSOFT_TENANT_ID=your-tenant-id" \
  "MICROSOFT_CLIENT_SECRET=your-client-secret"
```

---

## 🔍 Hybrid Approach (Recommended)

Keep your Next.js UI deployed to Vercel/Azure Static Web Apps and create specific Azure Functions for heavy processing:

1. **Frontend**: Deploy Next.js to Vercel or Azure Static Web Apps
2. **API Functions**: Create Azure Functions for:
   - Heavy RMA processing
   - Teams search operations
   - Scheduled tasks

This gives you the best of both worlds:
- Fast, scalable UI hosting
- Serverless functions for compute-intensive tasks
- Cost-effective scaling

---

## 📝 Next Steps

1. **Choose your deployment strategy** based on your needs
2. **Set up GitHub repository** if not already done
3. **Configure secrets and environment variables**
4. **Test locally** before deploying
5. **Monitor** using Azure Application Insights

## 🚨 Important Considerations

- **Cold Starts**: Azure Functions may have cold start delays
- **Timeouts**: Default timeout is 5 minutes (can extend to 10)
- **CORS**: Configure CORS for your frontend domain
- **Authentication**: Ensure OAuth redirects are updated for production URLs
- **Costs**: Monitor usage to avoid unexpected charges

Need help with a specific deployment approach? Let me know which option works best for your use case!
