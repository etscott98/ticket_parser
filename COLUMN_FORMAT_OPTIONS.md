# Excel Column Format Options

You now have two options for how the AI reason data is stored in Excel:

## Option 1: Separate Columns (Recommended) 

**Configuration**: `USE_SEPARATE_COLUMNS=true` (default)

### Required Excel Columns:
- Date
- RMA #
- VIDs Associated  
- Customer Information
- Status
- **Primary Reason**
- **Specific Issue**
- **Customer Impact** 
- **Timeline**
- **Additional Notes**

### Benefits:
✅ **Better for Analysis** - Filter/sort by primary reason category  
✅ **Better for Reporting** - Create charts by reason type  
✅ **Better for Searching** - Find specific issues or customer impacts  
✅ **Better for Data Processing** - Each field is separate for formulas  
✅ **Better for Export** - Clean data for other systems  

### Example Data:
| Primary Reason | Specific Issue | Customer Impact | Timeline | Additional Notes |
|----------------|----------------|-----------------|----------|------------------|
| Installation Problem | G-Connect device unable to pair with network | Cannot use smart features | During initial installation | Replacement unit being sent |
| Product Defect | Gas valve failure preventing pilot light | Complete loss of hot water | 3 months after installation | Under warranty, troubleshooting attempted |
| Wrong Item | Received 40-gallon instead of 50-gallon | Insufficient capacity for family | Upon delivery | Correct unit being shipped |

## Option 2: Single Column 

**Configuration**: `USE_SEPARATE_COLUMNS=false`

### Required Excel Columns:
- Date
- RMA #
- VIDs Associated
- Customer Information  
- Status
- **Reason for Return** (contains all organized data)

### Benefits:
✅ **Simpler Setup** - Only one additional column needed  
✅ **Complete Context** - All information in one place  
✅ **Readable Format** - Human-friendly structured text  

### Example Data:
| Reason for Return |
|-------------------|
| **PRIMARY REASON:** Installation Problem<br>**SPECIFIC ISSUE:** G-Connect device unable to pair with network<br>**CUSTOMER IMPACT:** Cannot use smart features<br>**TIMELINE:** During initial installation<br>**ADDITIONAL NOTES:** Replacement unit being sent |

## How to Choose Your Format

### Use Separate Columns If:
- You plan to analyze/filter by reason categories
- You want to create charts/reports by reason type  
- You export data to other systems
- You prefer structured data for Excel formulas
- You have multiple people analyzing the data

### Use Single Column If:
- You prefer simpler Excel setup
- You mainly read the data rather than analyze it
- You want all context in one place
- You have existing workflows expecting one column

## Setting Up Your Excel File

### For Separate Columns (Recommended):
1. **Add these column headers** to your Excel file:
   - Primary Reason
   - Specific Issue  
   - Customer Impact
   - Timeline
   - Additional Notes

2. **Run the script** (separate columns is the default):
   ```bash
   python main.py
   ```

### For Single Column:
1. **Keep existing** "Reason for Return" column
2. **Set environment variable**:
   ```bash
   $env:USE_SEPARATE_COLUMNS="false"
   python main.py
   ```

## Column Descriptions

| Column | Content | Example |
|--------|---------|---------|
| **Primary Reason** | Main category | "Product Defect", "Installation Problem", "Wrong Item" |
| **Specific Issue** | Detailed problem | "Gas valve failure preventing pilot light from staying lit" |
| **Customer Impact** | Effect on customer | "Complete loss of hot water for household" |  
| **Timeline** | When issue occurred | "Started 3 months after installation" |
| **Additional Notes** | Extra details | "Customer followed manual troubleshooting, unit under warranty" |

## Migration Between Formats

The script automatically detects which format to use based on your Excel columns and the `USE_SEPARATE_COLUMNS` setting. You can:

1. **Start with single column** and migrate to separate columns later by adding the new columns
2. **Start with separate columns** from the beginning (recommended)
3. **Switch back and forth** by changing the environment variable

## Recommendation

**Use separate columns** - they provide much better data analysis capabilities while the script still shows the organized information during processing. You get the best of both worlds!


