# Installing Poppler for PDF-to-Image Conversion

## What is Poppler?

Poppler is a PDF rendering library that `pdf2pic` uses to convert PDF pages to images. It must be installed on your system (not just as an npm package).

## Installation by Platform

### Windows

#### Option 1: Using Chocolatey (Recommended)

```powershell
# Install Chocolatey first if you don't have it
# Then:
choco install poppler
```

#### Option 2: Manual Installation

1. Download from: https://github.com/oschwartz10612/poppler-windows/releases
2. Extract to `C:\poppler` (or your preferred location)
3. Add `C:\poppler\Library\bin` to your PATH environment variable
4. Restart terminal/IDE

#### Verify Installation

```powershell
pdftoppm -h
# Should show help text (not "command not found")
```

### macOS

```bash
# Using Homebrew
brew install poppler

# Verify
pdftoppm -h
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install poppler-utils

# Verify
pdftoppm -h
```

### Linux (CentOS/RHEL/Fedora)

```bash
# CentOS/RHEL
sudo yum install poppler-utils

# Fedora
sudo dnf install poppler-utils

# Verify
pdftoppm -h
```

## Verify Installation

After installing, verify it works:

```bash
# Check if pdftoppm is available
pdftoppm -h

# Should output help text, not an error
```

## Troubleshooting

### "pdftoppm: command not found"

**Windows:**
- Check PATH includes poppler bin directory
- Restart terminal/IDE after adding to PATH

**macOS/Linux:**
- Verify installation: `which pdftoppm`
- If not found, reinstall poppler-utils

### "pdf2pic still fails"

**Check:**
1. Is poppler installed? (`pdftoppm -h`)
2. Is pdf2pic installed? (`npm list pdf2pic`)
3. Restart server after installation
4. Check server logs for specific error

## Next Steps

After installing poppler:

1. **Install pdf2pic npm package:**
   ```bash
   cd backend/services/api-gateway
   npm install pdf2pic
   ```

2. **Restart server:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Test with scanned PDF** - Should work now!

## Alternative: Docker

If you're using Docker, add poppler to your Dockerfile:

```dockerfile
# For Ubuntu-based images
RUN apt-get update && apt-get install -y poppler-utils

# For Alpine-based images
RUN apk add --no-cache poppler-utils
```
