import { LibraryAsset, FolderAsset } from '@/types/asteria';

export const MOCK_FOLDERS: FolderAsset[] = [
    { 
        id: 101, 
        name: 'Campaign 01', 
        count: 24, 
        type: 'folder', 
        previews: [
            'https://picsum.photos/seed/camp1/120/120',
            'https://picsum.photos/seed/camp1b/120/120',
            'https://picsum.photos/seed/camp1c/120/120',
            'https://picsum.photos/seed/camp1d/120/120'
        ]
    },
    { 
        id: 102, 
        name: 'Raw Assets', 
        count: 128, 
        type: 'folder', 
        previews: [
            'https://picsum.photos/seed/raw1/120/120',
            'https://picsum.photos/seed/raw2/120/120',
            'https://picsum.photos/seed/raw3/120/120',
            'https://picsum.photos/seed/raw4/120/120'
        ]
    },
];

export const MOCK_LIBRARY: LibraryAsset[] = [
    { id: 1, name: 'cyberpunk_city.png', type: 'Processed', size: '2.4 MB', badges: ['PNG', '4X'], url: 'https://picsum.photos/seed/city/400/300' },
    { id: 2, name: 'portrait_raw.jpg', type: 'Uploaded', size: '1.2 MB', badges: ['JPG'], url: 'https://picsum.photos/seed/port/400/300' },
    { id: 3, name: 'car_render_alpha.png', type: 'Processed', size: '3.1 MB', badges: ['PNG', 'Alpha'], url: 'https://picsum.photos/seed/car/400/300' },
    { id: 4, name: 'texture_set_01.ue5', type: 'UE5 Set', size: '15 MB', badges: ['Norm', 'Depth'], url: 'https://picsum.photos/seed/tex/400/300' },
    { id: 5, name: 'logo_vectorized.svg', type: 'SVG', size: '150 KB', badges: ['SVG'], url: 'https://picsum.photos/seed/logo/400/300' },
    { id: 6, name: 'landscape_upscaled.png', type: 'Processed', size: '5.2 MB', badges: ['PNG', '2X'], url: 'https://picsum.photos/seed/land/400/300' },
];
