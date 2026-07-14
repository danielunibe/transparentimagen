export function formatBytes(bytes: number, decimals = 1): string {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || '';
}

export async function getImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            reject(new Error("Failed to load image for dimensions"));
        };
        img.src = imageUrl;
    });
}

export function formatDate(timestamp?: number): string {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

export function getAspectRatio(width: number, height: number): string {
    if (!width || !height) return '';
    const divisor = gcd(width, height);
    const w = width / divisor;
    const h = height / divisor;
    
    // Check some common aspect ratios with leeway
    const ratio = width / height;
    if (Math.abs(ratio - 16/9) < 0.05) return '16:9';
    if (Math.abs(ratio - 4/3) < 0.05) return '4:3';
    if (Math.abs(ratio - 1) < 0.05) return '1:1';
    if (Math.abs(ratio - 3/2) < 0.05) return '3:2';
    if (Math.abs(ratio - 2/3) < 0.05) return '2:3';
    if (Math.abs(ratio - 9/16) < 0.05) return '9:16';
    if (Math.abs(ratio - 2.35) < 0.05) return '21:9'; // Approx cinematic
    
    // If numbers are too big, just return decimal
    if (w > 30 || h > 30) {
       return ratio.toFixed(2);
    }
    
    return `${w}:${h}`;
}

export function getVariantSummary(variants: any[]): string {
    if (!variants || variants.length === 0) return 'Original only';
    const num = variants.length;
    return `${num} variant${num === 1 ? '' : 's'}`;
}

export function getAiSummary(aiJobs: any[]): string {
    if (!aiJobs || aiJobs.length === 0) return 'No AI processing';
    const active = aiJobs.filter(j => j.status !== 'completed' && j.status !== 'failed').length;
    const completed = aiJobs.filter(j => j.status === 'completed').length;
    if (active > 0) return `${active} active job${active === 1 ? '' : 's'}`;
    return `${completed} completed job${completed === 1 ? '' : 's'}`;
}

export function getExportSummary(exportJobs: any[]): string {
    if (!exportJobs || exportJobs.length === 0) return 'Not exported';
    const completed = exportJobs.filter(j => j.status === 'completed').length;
    if (completed === 0) return 'Pending export';
    return `${completed} export${completed === 1 ? '' : 's'}`;
}

