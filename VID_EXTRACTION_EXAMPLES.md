# Enhanced VID/Device ID Extraction

The script now intelligently extracts 10-digit device IDs (VIDs) from anywhere in the ticket content, not just the custom field.

## What It Finds

### Sources Searched:
- **Ticket Subject**
- **Ticket Description** 
- **All Conversation Messages**
- **Custom Field** (original functionality)

### ID Patterns Recognized:
- `1234567890` - Plain 10-digit numbers
- `VID1234567890` - With VID prefix
- `ID 1234567890` - With ID prefix and space
- `Serial Number: 1234567890` - With Serial prefix
- `Device ID: 1234567890` - With Device prefix
- `1234-567-890` - With dashes (4-3-3 format)
- `123-456-7890` - With dashes (3-3-4 format)
- `1234 567 890` - With spaces

## Example Ticket Content

### Ticket Subject:
```
"Leslee Rogath - Connect failing to pair"
```

### Ticket Description:
```
"Leslee Henkel 917-572-2014 is getting a replacement G-Connect sent for her old one due to failure to pair. 
New install on water heater with VID 1234567890 and control unit ID 9876543210."
```

### Conversation:
```
"Customer reports that device serial number 5555-444-333 is not connecting to WiFi. 
Also having issues with backup unit 1111222333."
```

### Result:
```
VIDs Associated: 1111222333, 1234567890, 5555444333, 9876543210
```

## Output Example

### Standard Output:
```
Step 2: Extracting ticket data...
   → VIDs: '1234567890, 9876543210, 5555444333' (found 3 device ID(s))
```

### Verbose Output (--verbose flag):
```
Step 2: Extracting ticket data...
   → VIDs: '1234567890, 9876543210, 5555444333' (found 3 device ID(s))
      VID sources: description: 1234567890, 9876543210; conversation_1: 5555444333
```

## Benefits

✅ **Comprehensive** - Finds VIDs mentioned anywhere in the ticket  
✅ **Flexible** - Handles various formatting (dashes, spaces, prefixes)  
✅ **Deduplicates** - Removes duplicates automatically  
✅ **Sorted** - Returns VIDs in consistent sorted order  
✅ **Traceable** - Shows where each VID was found (in verbose mode)  
✅ **Combines Sources** - Merges custom field + text content  

## Common Scenarios

### Multiple Devices Mentioned:
```
"Customer has two units: VID1234567890 (main) and backup unit 9876543210"
→ Result: "1234567890, 9876543210"
```

### Formatted IDs:
```
"Serial numbers: 1234-567-890 and 098-765-4321"  
→ Result: "0987654321, 1234567890"
```

### Mixed Sources:
```
Custom Field: "1111111111"
Description: "Device ID: 2222222222"
Conversation: "Also having issues with 3333333333"
→ Result: "1111111111, 2222222222, 3333333333"
```

### No False Positives:
```
"Phone number 555-123-4567 and order #12345" 
→ Result: (none found - not 10 digits)
```

## Configuration

The VID extraction works with both column formats:

### Separate Columns Mode:
- VIDs go into dedicated "VIDs Associated" column

### Single Column Mode:  
- VIDs still go into "VIDs Associated" column (unchanged)

## Backward Compatibility

- **Still checks custom field** (original functionality preserved)
- **Same output format** (comma-separated list)
- **Same column name** ("VIDs Associated")
- **Enhanced capability** (now finds more VIDs from ticket content)

This enhancement significantly improves VID detection without breaking existing functionality!


