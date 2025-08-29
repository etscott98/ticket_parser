# Azure App Registration - Redirect URI Setup

To fix the Teams authentication, you need to update your Azure app registration with the correct redirect URI.

## Steps to Update Azure

### 1. Go to Azure Portal
- Visit [portal.azure.com](https://portal.azure.com)
- Navigate to **Azure Active Directory** → **App registrations**
- Find your app: `fbdf2f53-eaa7-4b57-9ac9-4589834ba4c8`

### 2. Update Authentication Settings
1. Click on your app registration
2. Go to **Authentication** in the left sidebar
3. Under **Platform configurations**, click **Add a platform**
4. Select **Single-page application (SPA)**
5. Add these redirect URIs:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://your-vercel-domain.vercel.app/auth/callback` (for production)

### 3. Configure Advanced Settings
In the **Authentication** section:
- ✅ **Access tokens** (used for implicit flows)
- ✅ **ID tokens** (used for implicit and hybrid flows)
- ✅ **Allow public client flows**: Yes

### 4. Verify Permissions
Go to **API permissions** and ensure you have:
- ✅ `Chat.Read` (Delegated)
- ✅ `User.Read` (Delegated)
- ✅ `openid` (Delegated)
- ✅ `email` (Delegated)

Admin consent should be granted for all permissions.

## Current Configuration
- **Client ID**: `fbdf2f53-eaa7-4b57-9ac9-4589834ba4c8`
- **Tenant ID**: `858daf00-c836-4a10-bcd6-d20b065253c0`
- **New Redirect URI**: `http://localhost:3000/auth/callback`

## How the New Auth Flow Works

1. **User clicks "Sign In to Microsoft"**
2. **Popup window opens** with Microsoft login
3. **User authenticates** in the popup
4. **Microsoft redirects** to `/auth/callback`
5. **Callback page extracts token** from URL
6. **Token sent back** to main window via postMessage
7. **Popup closes** automatically
8. **Main app receives token** and updates UI

This approach prevents the main page from freezing and provides a smooth authentication experience.

## Testing

After updating the redirect URI in Azure:
1. Restart your development server
2. Open `http://localhost:3000`
3. Click "Sign In to Microsoft"
4. You should see a popup window for authentication
5. After signing in, the popup should close and show "Connected" status

If you see any errors, check the browser console for detailed error messages.
