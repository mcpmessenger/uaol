/**
 * Generate a thumbnail from the first page of a PDF
 * Uses CDN to avoid Vite bundling issues
 */
export async function generatePDFThumbnail(file: File): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    // Load pdf.js from CDN (avoids Vite import issues)
    let pdfjsLib: any = (window as any).pdfjsLib;
    
    if (!pdfjsLib) {
      // Load pdf.js from CDN using UMD version
      await new Promise<void>((resolve, reject) => {
        // Check if already loading
        if ((window as any).pdfjsLoading) {
          // Wait for existing load
          const checkInterval = setInterval(() => {
            if ((window as any).pdfjsLib) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!(window as any).pdfjsLib) reject(new Error('Timeout loading pdf.js'));
          }, 10000);
          return;
        }
        
        (window as any).pdfjsLoading = true;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js';
        script.onload = () => {
          pdfjsLib = (window as any).pdfjsLib || (window as any).pdfjs;
          if (!pdfjsLib) {
            (window as any).pdfjsLoading = false;
            reject(new Error('Failed to load pdf.js'));
            return;
          }
          (window as any).pdfjsLib = pdfjsLib;
          if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
          }
          (window as any).pdfjsLoading = false;
          resolve();
        };
        script.onerror = () => {
          (window as any).pdfjsLoading = false;
          reject(new Error('Failed to load pdf.js from CDN'));
        };
        document.head.appendChild(script);
      });
      
      pdfjsLib = (window as any).pdfjsLib;
    }
    
    if (!pdfjsLib || !pdfjsLib.getDocument) {
      console.warn('pdf.js not properly loaded');
      return null;
    }
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0 // Suppress console warnings
    });
    const pdf = await loadingTask.promise;
    
    // Get first page
    const page = await pdf.getPage(1);
    
    // Set scale for thumbnail (fit to 128px width)
    const scale = 128 / page.getViewport({ scale: 1.0 }).width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return null;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Convert to data URL
    return canvas.toDataURL('image/png', 0.8); // 0.8 quality for smaller file size
  } catch (error) {
    console.error('Failed to generate PDF thumbnail:', error);
    return null;
  }
}
