# Enable New Places API (Required)

## 🚨 IMPORTANT: API Migration Required

Google has deprecated the legacy Places API. You need to enable the **new Places API (New)** in your Google Cloud Console.

## Step-by-Step Instructions:

### 1. Open Google Cloud Console
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Select your project or create a new one

### 2. Enable Places API (New)
- Navigate to **APIs & Services > Library**
- Search for **"Places API (New)"**
- Click on **"Places API (New)"** (NOT the legacy "Places API")
- Click **"Enable"**

### 3. Update API Key Restrictions (Recommended)
- Go to **APIs & Services > Credentials**
- Find your API key: `AIzaSyDJsSuh2WCkVW63FfVpfKXLOvqlXVTi7dI`
- Click **Edit** (pencil icon)
- Under **API restrictions**, add:
  - ✅ **Places API (New)** 
  - ✅ **Maps JavaScript API**
  - ❌ Remove **Places API** (legacy) if present
- Click **Save**

### 4. Verify Setup
- The application should now work without the legacy API error
- Location autocomplete will use the new API endpoints
- Check browser console for any remaining errors

## What Changed in the Code:

### ✅ **New Implementation:**
- Uses **Places API (New)** with HTTP requests
- Implements proper field masking as required
- Uses modern endpoints:
  - `places:searchText` for place search
  - `places:searchNearby` for reverse geocoding
- Better error handling and fallbacks

### ❌ **Removed (Legacy):**
- JavaScript Places Service
- AutocompleteService widget
- Legacy API endpoints

## API Endpoints Now Used:

1. **Text Search**: `https://places.googleapis.com/v1/places:searchText`
2. **Nearby Search**: `https://places.googleapis.com/v1/places:searchNearby`

## Field Masking Implemented:
```
X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.types
```

## Pricing Notes:
- New Places API has different pricing than legacy API
- Text Search: $32 per 1000 requests
- Nearby Search: $32 per 1000 requests
- Consider implementing caching for production use

## Troubleshooting:

### If you still see errors:
1. **Double-check API is enabled**: Ensure "Places API (New)" is enabled, not "Places API"
2. **API Key permissions**: Make sure the API key has access to "Places API (New)"
3. **Billing**: Ensure billing is enabled on your Google Cloud project
4. **Quotas**: Check if you've exceeded any quotas in Cloud Console

### Fallback Behavior:
- If Places API fails, users can still enter locations manually
- GPS location will still work (browser geolocation)
- Basic location names will be saved without coordinates

## Migration Benefits:
✅ **Improved Performance**: New API is faster and more reliable  
✅ **Better Data**: More accurate place information  
✅ **Future-Proof**: No more deprecation warnings  
✅ **Modern Architecture**: RESTful HTTP endpoints instead of JavaScript callbacks  

---

**Need Help?** Check the [official migration guide](https://developers.google.com/maps/documentation/places/web-service/migrate-to-new) or contact support.
