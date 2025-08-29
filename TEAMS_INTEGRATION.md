# Microsoft Teams Integration

This feature adds Microsoft Teams search capabilities to your RMA Management System. When processing an RMA ticket, if any 10-digit device IDs starting with "5A00" are found, the system will automatically search Microsoft Teams for additional information about those devices.

## Features

- **Automatic Detection**: Searches for 10-digit device IDs starting with "5A00" 
- **Teams Search**: Searches Teams messages based on available permissions
- **Graceful Fallback**: Works with limited permissions, provides helpful feedback
- **Integrated Display**: Teams results appear alongside Freshdesk and AI analysis

## Permission Levels

### **Current Setup (Limited Permissions)**
With your current permissions (`chat.read`, `user.read`, `email`, `openid`):
- ✅ **Can authenticate** with Microsoft Graph
- ✅ **Can access basic user info** 
- ⚠️ **Limited search capabilities** - can access user's chats but cannot search message content
- ℹ️ **Provides feedback** about permission limitations

### **Full Functionality (Recommended)**
For complete Teams search, these Application permissions are needed:
- `Chat.Read.All` - Read all chat messages
- `ChannelMessage.Read.All` - Read all channel messages  
- `Team.ReadBasic.All` - Read basic team info
- `User.Read.All` - Read user profiles

## Setup Requirements

### 1. Azure App Registration

You need to create an Azure App Registration to access Microsoft Graph API:

1. **Go to Azure Portal** → Azure Active Directory → App registrations
2. **Click "New registration"**
3. **Name**: `RMA Teams Search` (or similar)
4. **Supported account types**: Accounts in this organizational directory only
5. **Redirect URI**: Not needed for this app
6. **Click "Register"**

### 2. Configure API Permissions

In your Azure App Registration:

1. **Go to "API permissions"**
2. **Click "Add a permission"**
3. **Select "Microsoft Graph"**
4. **Choose "Application permissions"**
5. **Add these permissions**:
   - `Chat.Read.All` - Read all chat messages
   - `ChannelMessage.Read.All` - Read all channel messages
   - `Team.ReadBasic.All` - Read basic team info
   - `User.Read.All` - Read user profiles
6. **Click "Grant admin consent"** (requires admin privileges)

### 3. Create Client Secret

1. **Go to "Certificates & secrets"**
2. **Click "New client secret"**
3. **Description**: `RMA Teams Integration`
4. **Expires**: Choose appropriate duration (24 months recommended)
5. **Copy the secret value** (you won't see it again!)

### 4. Get Required IDs

From your Azure App Registration, copy:
- **Application (client) ID** from Overview page
- **Directory (tenant) ID** from Overview page
- **Client secret value** from step 3

### 5. Environment Configuration

Add these to your `.env` file:

```env
# Microsoft Teams Configuration
MICROSOFT_CLIENT_ID=your_azure_app_client_id
MICROSOFT_CLIENT_SECRET=your_azure_app_client_secret
MICROSOFT_TENANT_ID=your_azure_tenant_id
```

## How It Works

### Processing Flow

1. **RMA Processing Starts**: User enters RMA number
2. **Freshdesk Fetch**: System gets ticket data and extracts device IDs
3. **5A00 Detection**: System identifies any 10-digit IDs starting with "5A00"
4. **Teams Search**: For each 5A00 device ID, searches Microsoft Teams
5. **Results Integration**: Teams findings are included in the final results

### Search Logic

- **Pattern Matching**: Only searches for IDs matching `5A00######` (10 digits total)
- **Comprehensive Search**: Searches across:
  - Direct messages (chats)
  - Channel messages
  - Group conversations
- **Relevance Scoring**: Results are ranked by Microsoft Graph relevance
- **Recent Focus**: Prioritizes recent messages in summaries

### Example Output

```
Found 3 Teams message(s) mentioning device 5A00123456:

Recent activity:
1. Aug 25, 2025 - John Smith: Device 5A00123456 showing error code 42, customer reports no hot water...
2. Aug 23, 2025 - Sarah Johnson: Warranty lookup for 5A00123456 - unit installed March 2024...
3. Aug 20, 2025 - Mike Wilson: 5A00123456 has known firmware issue, recommend version 2.1.3 update...

Users involved: John Smith, Sarah Johnson, Mike Wilson
```

## Security & Privacy

### Data Access
- **Read-Only**: App only reads messages, never writes or modifies
- **Scoped Access**: Only searches for specific device IDs
- **No Storage**: Teams message content is not permanently stored

### Permissions
- Requires **Application permissions** (works without user login)
- Needs **Admin consent** for organization-wide access
- Access is **audit logged** by Microsoft

### Best Practices
- **Least Privilege**: Only grant necessary permissions
- **Regular Review**: Audit app permissions periodically
- **Secure Storage**: Keep client secrets in environment variables
- **Access Monitoring**: Monitor usage through Azure logs

## Troubleshooting

### Common Issues

**"Authentication failed"**
- Check client ID, secret, and tenant ID are correct
- Verify client secret hasn't expired
- Ensure admin consent was granted

**"No Teams messages found"**
- Verify the device ID format (must be 5A00XXXXXX)
- Check if device ID exists in accessible Teams conversations
- Confirm app has proper permissions

**"Permission denied"**
- Verify admin consent was granted for all required permissions
- Check if your organization restricts app access
- Ensure app registration is in correct tenant

### Testing

To test Teams integration:
1. **Create test messages** in Teams mentioning a 5A00 device ID
2. **Process an RMA** with that device ID in Freshdesk
3. **Check results** should show Teams messages in the UI

### Logs

Teams search activities are logged in the console:
```
🔍 Searching Teams for device ID: 5A00123456
📡 Executing Teams search for: 5A00123456
📊 Found 3 Teams messages
✅ Teams search complete: Found 3 message(s)
```

## Optional Configuration

### Search Limits
- **Default**: 25 messages per device ID
- **Configurable**: Modify `size` parameter in `teams.ts`

### Message Preview
- **Default**: 100 characters per message
- **Configurable**: Modify `substring(0, 100)` in summary generation

### Time Range
- **Default**: All accessible messages
- **Potential Enhancement**: Add date range filtering

## Disabling Teams Integration

If you don't want Teams integration:
1. **Don't add** Microsoft environment variables
2. **Teams search will be skipped** automatically
3. **Processing continues** with Freshdesk and AI analysis only
4. **No errors** - gracefully handles missing configuration

## Future Enhancements

Possible future additions:
- **Date range filtering** for Teams searches
- **File attachment analysis** from Teams messages
- **Cross-reference with SharePoint** documents
- **Teams conversation threading** for better context
- **Direct links** to Teams messages in results
