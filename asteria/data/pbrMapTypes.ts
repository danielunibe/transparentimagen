import { PbrMapType } from '@/types/asteria';

export const PBR_BASE_COLOR_EQUIVALENTS: PbrMapType[] = ['base_color', 'albedo', 'diffuse'];
export const PBR_REQUIRED_COMPLETE_MAPS: PbrMapType[] = ['base_color', 'normal', 'roughness'];
export const PBR_OPTIONAL_MAPS: PbrMapType[] = ['ambient_occlusion', 'metallic', 'height', 'opacity', 'emissive'];

export const PBR_MAP_LABELS: Record<PbrMapType, string> = {
  base_color: 'Base Color',
  albedo: 'Albedo',
  diffuse: 'Diffuse',
  normal: 'Normal',
  roughness: 'Roughness',
  metallic: 'Metallic',
  ambient_occlusion: 'Ambient Occlusion',
  height: 'Height',
  displacement: 'Displacement',
  opacity: 'Opacity',
  alpha: 'Alpha',
  emissive: 'Emissive',
  specular: 'Specular',
  gloss: 'Gloss',
  unknown: 'Unknown',
};
