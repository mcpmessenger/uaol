# PowerShell: Admin vs Regular - When to Use Each

## Quick Answer

**For most development work in Cursor: Regular PowerShell is fine!**

You only need **Admin PowerShell** for:
- Installing system packages (like poppler via Chocolatey)
- Modifying system PATH (though GUI works too)
- System-level changes

## When to Use Each

### ✅ Regular PowerShell (Default in Cursor)

**Use for:**
- ✅ Running `npm install`
- ✅ Running `npm run dev`
- ✅ Running Node.js scripts
- ✅ Git commands
- ✅ Editing files
- ✅ Most development tasks

**Example:**
```powershell
cd backend
npm run dev
```

### ⚠️ Admin PowerShell (Right-click → "Run as Administrator")

**Use for:**
- ⚠️ Installing system packages: `choco install poppler`
- ⚠️ Modifying system PATH via command line
- ⚠️ System-level configuration

**Example:**
```powershell
# Need admin for this
choco install poppler
```

## For Poppler Installation

### Option 1: Manual Installation (No Admin Needed)

1. **Download poppler** (no admin needed)
2. **Extract to `C:\poppler\poppler-25.12.0`** (no admin needed)
3. **Add to PATH via GUI** (no admin needed):
   - `Win + R` → `sysdm.cpl` → "Environment Variables"
   - Add: `C:\poppler\poppler-25.12.0\Library\bin`
   - OK all dialogs
4. **Restart PowerShell** (no admin needed)

### Option 2: Chocolatey (Needs Admin)

If using Chocolatey:
```powershell
# Must run PowerShell as Administrator
choco install poppler
```

## In Cursor

**Cursor's integrated terminal uses regular PowerShell** - this is fine for:
- ✅ All development work
- ✅ npm commands
- ✅ Running servers
- ✅ Testing

**If you need admin:**
1. Open **separate PowerShell window** (outside Cursor)
2. Right-click → "Run as Administrator"
3. Run admin commands there
4. Close admin window
5. Continue in Cursor's regular terminal

## Current Situation

For your current setup:

### ✅ Already Done (No Admin Needed)
- Poppler downloaded and extracted
- Code implemented
- Server running

### ⚠️ What Needs Admin (If Using Chocolatey)
- Installing poppler via `choco install poppler`

### ✅ What Doesn't Need Admin
- Adding poppler to PATH (use GUI method)
- Installing npm packages (`npm install pdf2pic`)
- Running server (`npm run dev`)
- Testing OCR

## Recommended Approach

**Use regular PowerShell in Cursor for everything**, except:

1. **If installing poppler via Chocolatey:**
   - Open separate Admin PowerShell
   - Run `choco install poppler`
   - Close admin window
   - Continue in Cursor

2. **If adding to PATH manually:**
   - Use GUI (no admin needed)
   - Or use regular PowerShell with GUI method

## Summary

**For Cursor development:**
- ✅ **Regular PowerShell** - Use for 99% of tasks
- ⚠️ **Admin PowerShell** - Only for system installs (like Chocolatey)

**For poppler specifically:**
- ✅ **Manual install + GUI PATH** - No admin needed
- ⚠️ **Chocolatey install** - Needs admin

**You can do everything in regular PowerShell except Chocolatey installs!**
