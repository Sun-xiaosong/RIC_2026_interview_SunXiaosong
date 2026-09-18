// 上课地点(venue)到港大教学楼(building)的映射与楼栋经纬度坐标表。
// 坐标取自 OpenStreetMap 建筑数据(Nominatim 查询),与地图底图(OSM 瓦片)精确对齐;
// CPD 为百周年校园两塔(郑裕彤楼/邵逸夫楼)之间中央平台的近似中心点。

export interface BuildingInfo {
  key: string;
  name: string;
  lat: number;
  lng: number;
}

export const HKU_CENTER: [number, number] = [22.2835, 114.1380];

export const BUILDINGS: Record<string, BuildingInfo> = {
  MB: { key: 'MB', name: 'Main Building 本部大楼', lat: 22.284022, lng: 114.137858 },
  KKLG: { key: 'KKLG', name: 'K.K. Leung Building 梁銶琚楼', lat: 22.283261, lng: 114.139036 },
  LE: { key: 'LE', name: 'Library Extension 图书馆新翼', lat: 22.283307, lng: 114.137820 },
  MWT: { key: 'MWT', name: 'Meng Wah Complex 明华综合大楼', lat: 22.282326, lng: 114.139162 },
  CYPP: { key: 'CYPP', name: 'Chong Yuet Ming Physics Building 张玉明物理楼', lat: 22.283220, lng: 114.139853 },
  KB: { key: 'KB', name: 'Knowles Building', lat: 22.283200, lng: 114.138455 },
  TT: { key: 'TT', name: 'T.T. Tsui Building 徐展堂楼', lat: 22.283913, lng: 114.139434 },
  CBA: { key: 'CBA', name: 'Composite Building 综合楼', lat: 22.283194, lng: 114.135904 },
  CPD: { key: 'CPD', name: 'Centennial Campus 百周年校园', lat: 22.283500, lng: 114.134100 },
};

// 已知 venue 的精确映射(数据集中出现的 21 个非空地点)
const VENUE_BUILDING: Record<string, string> = {
  MB141: 'MB', MB167: 'MB', MB237: 'MB',
  KKLG102: 'KKLG', KKLG103: 'KKLG', KKLG104: 'KKLG', KKLG106: 'KKLG', KK101: 'KKLG',
  LE1: 'LE', LE8: 'LE', LE9: 'LE',
  MWT2: 'MWT', MWT4: 'MWT',
  CYPP3: 'CYPP', CYPP4: 'CYPP',
  KB223: 'KB',
  TT404: 'TT',
  CBA: 'CBA',
  'CPD-3.21': 'CPD', 'CPD-3.22': 'CPD', 'CPD-3.23': 'CPD',
};

// 未来出现新 venue 时按前缀兜底(顺序即优先级)
const VENUE_PREFIX_FALLBACK: Array<[string, string]> = [
  ['CPD-', 'CPD'],
  ['KKLG', 'KKLG'],
  ['CYPP', 'CYPP'],
  ['MWT', 'MWT'],
  ['MB', 'MB'],
  ['LE', 'LE'],
  ['KK', 'KKLG'],
  ['KB', 'KB'],
  ['TT', 'TT'],
  ['CBA', 'CBA'],
];

export function resolveVenue(venue: string): BuildingInfo | null {
  const trimmed = venue.trim().toUpperCase();
  if (!trimmed) return null;
  const direct = VENUE_BUILDING[trimmed];
  if (direct && BUILDINGS[direct]) return BUILDINGS[direct];
  for (const [prefix, key] of VENUE_PREFIX_FALLBACK) {
    if (trimmed.startsWith(prefix) && BUILDINGS[key]) return BUILDINGS[key];
  }
  return null;
}
