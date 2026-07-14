import { SmartCollection } from '@/types/asteria';

export const builtInCollections: SmartCollection[] = [
    {
        id: 'coll_recently_edited',
        kind: 'recently_edited',
        label: 'Recently Edited',
        description: 'Assets modified recently',
        builtIn: true,
        icon: 'Clock',
        criteria: {
            sortMode: 'date_desc',
            hasVariants: true
            // we can refine further in filter logic
        }
    },
    {
        id: 'coll_has_variants',
        kind: 'has_variants',
        label: 'Has Variants',
        description: 'Assets with one or more variants',
        builtIn: true,
        icon: 'Layers',
        criteria: {
            hasVariants: true
        }
    },
    {
        id: 'coll_ai_processed',
        kind: 'ai_processed',
        label: 'AI Processed',
        description: 'Assets processed with AI',
        builtIn: true,
        icon: 'Sparkles',
        criteria: {
            hasAiJobs: true
        }
    },
    {
        id: 'coll_exported',
        kind: 'exported',
        label: 'Exported',
        description: 'Assets exported successfully',
        builtIn: true,
        icon: 'Download',
        criteria: {
            hasExports: true
        }
    },
    {
        id: 'coll_adjusted',
        kind: 'adjusted',
        label: 'Adjusted',
        description: 'Assets with color, brightness, or contrast adjustments',
        builtIn: true,
        icon: 'SlidersHorizontal',
        criteria: {
            hasAdjustments: true
        }
    },
    {
        id: 'coll_metadata_only',
        kind: 'metadata_only',
        label: 'Metadata Only',
        description: 'Variants stored without image payload',
        builtIn: true,
        icon: 'Database',
        criteria: {
            hasMetadataOnlyVariants: true
        }
    },
    {
        id: 'coll_session_outputs',
        kind: 'session_outputs',
        label: 'Session Outputs',
        description: 'Local temporary variants',
        builtIn: true,
        icon: 'MemoryStick',
        criteria: {
            hasSessionOutputs: true
        }
    },
    {
        id: 'coll_cutouts',
        kind: 'cutouts',
        label: 'Cutouts',
        description: 'Assets with removed backgrounds',
        builtIn: true,
        icon: 'Scissors',
        criteria: {
            hasCutout: true
        }
    },
    {
        id: 'coll_upscaled',
        kind: 'upscaled',
        label: 'Upscaled',
        description: 'Assets enlarged through the local upscale sidecar',
        builtIn: true,
        icon: 'Maximize2',
        criteria: {
            hasUpscaled: true
        }
    },
    {
        id: 'coll_images',
        kind: 'images',
        label: 'Images Only',
        description: 'Show only image assets',
        builtIn: true,
        icon: 'Image',
        criteria: {
            filterMode: 'images'
        }
    },
    {
        id: 'coll_photos',
        kind: 'photos',
        label: 'Photos',
        description: 'Photo items in the media library',
        builtIn: true,
        icon: 'Image',
        criteria: {
            mediaKind: 'image'
        }
    },
    {
        id: 'coll_videos',
        kind: 'videos',
        label: 'Videos',
        description: 'Video items detected locally',
        builtIn: true,
        icon: 'Film',
        criteria: {
            mediaKind: 'video'
        }
    },
    {
        id: 'coll_screenshots',
        kind: 'screenshots',
        label: 'Screenshots',
        description: 'Assets likely to be screenshots',
        builtIn: true,
        icon: 'Monitor',
        criteria: {
            isScreenshot: true
        }
    },
    {
        id: 'coll_unorganized',
        kind: 'unorganized',
        label: 'Unorganized',
        description: 'Assets still missing richer organization metadata',
        builtIn: true,
        icon: 'Inbox',
        criteria: {
            isUnorganized: true
        }
    },
    {
        id: 'coll_missing_metadata',
        kind: 'missing_metadata',
        label: 'Missing Metadata',
        description: 'Assets missing camera/date/place metadata',
        builtIn: true,
        icon: 'Database',
        criteria: {
            hasMissingMetadata: true
        }
    },
    {
        id: 'coll_large_files',
        kind: 'large_files',
        label: 'Large Files',
        description: 'Large assets that may need review',
        builtIn: true,
        icon: 'HardDrive',
        criteria: {
            isLargeFile: true
        }
    },
    {
        id: 'coll_by_year',
        kind: 'by_year',
        label: 'By Year',
        description: 'Assets grouped by detected year in Organizer',
        builtIn: true,
        icon: 'Calendar',
        criteria: {}
    },
    {
        id: 'coll_recently_imported',
        kind: 'recently_imported',
        label: 'Recently Imported',
        description: 'Most recently added assets',
        builtIn: true,
        icon: 'Clock',
        criteria: {
            sortMode: 'date_desc'
        }
    },
    {
        id: 'coll_possible_duplicates',
        kind: 'possible_duplicates',
        label: 'Possible Duplicates',
        description: 'Placeholder collection for duplicate review',
        builtIn: true,
        icon: 'Copy',
        criteria: {
            isDuplicateCandidate: true
        }
    },
    {
        id: 'coll_folders',
        kind: 'folders',
        label: 'Folders Only',
        description: 'Show only folder assets',
        builtIn: true,
        icon: 'Folder',
        criteria: {
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_smart_folders',
        kind: 'smart_folders',
        label: 'Smart Folders',
        description: 'Folders interpreted as smart local workspaces',
        builtIn: true,
        icon: 'Sparkles',
        criteria: {
            isSmartFolder: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_photo_folders',
        kind: 'photo_folders',
        label: 'Photo Folders',
        description: 'Smart folders dominated by photos',
        builtIn: true,
        icon: 'Image',
        criteria: {
            smartFolderKind: 'photo_folder',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_video_folders',
        kind: 'video_folders',
        label: 'Video Folders',
        description: 'Smart folders dominated by videos',
        builtIn: true,
        icon: 'Film',
        criteria: {
            smartFolderKind: 'video_folder',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_pbr_material_folders',
        kind: 'pbr_material_folders',
        label: 'PBR Material Folders',
        description: 'Smart folders with recognizable PBR texture maps',
        builtIn: true,
        icon: 'Folder',
        criteria: {
            smartFolderKind: 'pbr_material_folder',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_texture_set_folders',
        kind: 'texture_set_folders',
        label: 'Texture Set Folders',
        description: 'Folders with partial texture-set signals',
        builtIn: true,
        icon: 'Folder',
        criteria: {
            smartFolderKind: 'texture_set_folder',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_needs_review_folders',
        kind: 'needs_review_folders',
        label: 'Needs Review Folders',
        description: 'Smart folders that still need manual review',
        builtIn: true,
        icon: 'Monitor',
        criteria: {
            smartFolderStatus: 'needs_review',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_materials',
        kind: 'materials',
        label: 'Materials',
        description: 'Detected material folders',
        builtIn: true,
        icon: 'Layers',
        criteria: {
            isMaterialFolder: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_complete_pbr_materials',
        kind: 'complete_pbr_materials',
        label: 'Complete PBR Materials',
        description: 'Materials with base color, normal and roughness',
        builtIn: true,
        icon: 'Layers',
        criteria: {
            materialStatus: 'complete',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_partial_pbr_materials',
        kind: 'partial_pbr_materials',
        label: 'Partial PBR Materials',
        description: 'Materials missing key maps',
        builtIn: true,
        icon: 'Layers',
        criteria: {
            materialStatus: 'partial',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_texture_sets',
        kind: 'texture_sets',
        label: 'Texture Sets',
        description: 'Incomplete but related texture groups',
        builtIn: true,
        icon: 'Layers',
        criteria: {
            materialStatus: 'texture_set',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_missing_normal_map',
        kind: 'missing_normal_map',
        label: 'Missing Normal Map',
        description: 'Materials missing a normal map',
        builtIn: true,
        icon: 'HardDrive',
        criteria: {
            missingMapType: 'normal',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_missing_roughness_map',
        kind: 'missing_roughness_map',
        label: 'Missing Roughness Map',
        description: 'Materials missing a roughness map',
        builtIn: true,
        icon: 'HardDrive',
        criteria: {
            missingMapType: 'roughness',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_favorite_materials',
        kind: 'favorite_materials',
        label: 'Favorite Materials',
        description: 'Favorite materials marked locally',
        builtIn: true,
        icon: 'Sparkles',
        criteria: {
            isFavoriteMaterial: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_materials_ready',
        kind: 'custom',
        label: 'Materials Ready',
        description: 'Materials with high completeness scores',
        builtIn: true,
        icon: 'Sparkles',
        criteria: {
            materialReady: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_materials_needs_review',
        kind: 'custom',
        label: 'Materials Needs Review',
        description: 'Materials that still need review',
        builtIn: true,
        icon: 'Monitor',
        criteria: {
            materialNeedsReview: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_materials_warnings',
        kind: 'custom',
        label: 'Materials With Warnings',
        description: 'Materials with warning diagnostics',
        builtIn: true,
        icon: 'Monitor',
        criteria: {
            hasMaterialWarnings: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_materials_errors',
        kind: 'custom',
        label: 'Materials With Errors',
        description: 'Materials with critical errors',
        builtIn: true,
        icon: 'HardDrive',
        criteria: {
            hasMaterialErrors: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_ready_blender',
        kind: 'custom',
        label: 'Ready for Blender',
        description: 'Materials ready for Blender',
        builtIn: true,
        icon: 'Sparkles',
        criteria: {
            readyTarget: 'blender',
            materialReady: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_ready_unreal',
        kind: 'custom',
        label: 'Ready for Unreal',
        description: 'Materials ready for Unreal',
        builtIn: true,
        icon: 'Sparkles',
        criteria: {
            readyTarget: 'unreal',
            materialReady: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_ready_unity',
        kind: 'custom',
        label: 'Ready for Unity',
        description: 'Materials ready for Unity',
        builtIn: true,
        icon: 'Sparkles',
        criteria: {
            readyTarget: 'unity',
            materialReady: true,
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_missing_base_color',
        kind: 'custom',
        label: 'Missing Base Color',
        description: 'Materials missing base color',
        builtIn: true,
        icon: 'HardDrive',
        criteria: {
            missingMapType: 'base_color',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_missing_normal',
        kind: 'custom',
        label: 'Missing Normal',
        description: 'Materials missing a normal map',
        builtIn: true,
        icon: 'HardDrive',
        criteria: {
            missingMapType: 'normal',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_missing_roughness',
        kind: 'custom',
        label: 'Missing Roughness',
        description: 'Materials missing a roughness map',
        builtIn: true,
        icon: 'HardDrive',
        criteria: {
            missingMapType: 'roughness',
            filterMode: 'folders'
        }
    },
    {
        id: 'coll_resolution_mismatch',
        kind: 'custom',
        label: 'Resolution Mismatch',
        description: 'Materials with mixed resolutions',
        builtIn: true,
        icon: 'HardDrive',
        criteria: {
            hasResolutionMismatch: true,
            filterMode: 'folders'
        }
    }
];
