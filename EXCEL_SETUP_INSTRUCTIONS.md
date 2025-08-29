# Excel Setup Instructions for Separate Columns

Your Excel file needs 5 additional columns for the enhanced organized reason data.

## Required New Columns

Add these **exact column headers** to your Excel file:

1. **Primary Reason**
2. **Specific Issue** 
3. **Customer Impact**
4. **Timeline** (this one wasn't in the error - might already exist)
5. **Additional Notes**

## Complete Column List

Your Excel file should have these columns (order doesn't matter):

### Existing Columns (keep these):
- Date
- RMA #
- VIDs Associated
- Customer Information  
- Status

### New Columns (add these):
- **Primary Reason**
- **Specific Issue**
- **Customer Impact**
- **Timeline**
- **Additional Notes**

## How to Add the Columns

### Option 1: Add Manually in Excel
1. Open your Excel file: `RMA List 08_2025 Automated.xlsx`
2. Add new columns with these exact headers:
   - Primary Reason
   - Specific Issue
   - Customer Impact
   - Timeline
   - Additional Notes
3. Save the file
4. Run the script again

### Option 2: Use Single Column Format (Temporary)
If you want to test immediately without modifying Excel:

```bash
$env:USE_SEPARATE_COLUMNS="false"
python main.py
```

This will use the single "Reason for Return" column format instead.

## Recommended Column Order

For best readability, consider this order:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Date | RMA # | VIDs Associated | Customer Information | Status | Primary Reason | Specific Issue | Customer Impact | Timeline | Additional Notes |

## What Each New Column Will Contain

| Column | Example Content |
|--------|-----------------|
| **Primary Reason** | "Product Defect", "Installation Problem", "Wrong Item" |
| **Specific Issue** | "Gas valve failure preventing pilot light from staying lit" |
| **Customer Impact** | "Complete loss of hot water for household" |
| **Timeline** | "Started 3 months after installation" |
| **Additional Notes** | "Customer followed manual troubleshooting, unit under warranty" |

## After Adding Columns

Once you add the columns, run the script again:

```bash
python main.py
```

The script will then process your tickets and fill in all the organized reason data!


