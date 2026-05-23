import { CityCoord } from "../types";

export const CITY_COORDS: CityCoord[] = [
  // 英国
  { city: "London", country: "英国", lat: 51.5074, lng: -0.1278 },
  { city: "Manchester", country: "英国", lat: 53.4808, lng: -2.2426 },
  { city: "Edinburgh", country: "英国", lat: 55.9533, lng: -3.1883 },
  { city: "Birmingham", country: "英国", lat: 52.4862, lng: -1.8904 },
  { city: "Glasgow", country: "英国", lat: 55.8642, lng: -4.2518 },
  // 美国
  { city: "Los Angeles", country: "美国", lat: 34.0522, lng: -118.2437 },
  { city: "New York", country: "美国", lat: 40.7128, lng: -74.006 },
  { city: "Boston", country: "美国", lat: 42.3601, lng: -71.0589 },
  { city: "San Francisco", country: "美国", lat: 37.7749, lng: -122.4194 },
  { city: "Chicago", country: "美国", lat: 41.8781, lng: -87.6298 },
  { city: "Seattle", country: "美国", lat: 47.6062, lng: -122.3321 },
  { city: "Austin", country: "美国", lat: 30.2672, lng: -97.7431 },
  // 澳大利亚
  { city: "Sydney", country: "澳大利亚", lat: -33.8688, lng: 151.2093 },
  { city: "Melbourne", country: "澳大利亚", lat: -37.8136, lng: 144.9631 },
  { city: "Brisbane", country: "澳大利亚", lat: -27.4698, lng: 153.0251 },
  // 加拿大
  { city: "Toronto", country: "加拿大", lat: 43.6532, lng: -79.3832 },
  { city: "Vancouver", country: "加拿大", lat: 49.2827, lng: -123.1207 },
  { city: "Montreal", country: "加拿大", lat: 45.5017, lng: -73.5673 },
  // 日本
  { city: "Tokyo", country: "日本", lat: 35.6762, lng: 139.6503 },
  { city: "Osaka", country: "日本", lat: 34.6937, lng: 135.5023 },
  // 韩国
  { city: "Seoul", country: "韩国", lat: 37.5665, lng: 126.978 },
  // 德国
  { city: "Berlin", country: "德国", lat: 52.52, lng: 13.405 },
  { city: "Munich", country: "德国", lat: 48.1351, lng: 11.582 },
  // 法国
  { city: "Paris", country: "法国", lat: 48.8566, lng: 2.3522 },
  // 新加坡
  { city: "Singapore", country: "新加坡", lat: 1.3521, lng: 103.8198 },
];

/** Chinese-to-English city name mapping */
export const CITY_NAME_MAP: Record<string, string> = {
  "伦敦": "London",
  "曼彻斯特": "Manchester",
  "爱丁堡": "Edinburgh",
  "伯明翰": "Birmingham",
  "格拉斯哥": "Glasgow",
  "纽约": "New York",
  "洛杉矶": "Los Angeles",
  "波士顿": "Boston",
  "旧金山": "San Francisco",
  "三藩市": "San Francisco",
  "芝加哥": "Chicago",
  "西雅图": "Seattle",
  "奥斯汀": "Austin",
  "悉尼": "Sydney",
  "雪梨": "Sydney",
  "墨尔本": "Melbourne",
  "布里斯班": "Brisbane",
  "多伦多": "Toronto",
  "温哥华": "Vancouver",
  "蒙特利尔": "Montreal",
  "东京": "Tokyo",
  "大阪": "Osaka",
  "首尔": "Seoul",
  "柏林": "Berlin",
  "慕尼黑": "Munich",
  "巴黎": "Paris",
  "新加坡": "Singapore",
};

/** Reverse mapping: English → Chinese */
export const CITY_EN_TO_CN: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_NAME_MAP).map(([cn, en]) => [en.toLowerCase(), cn])
);

/** All supported city names (both Chinese and English) for autocomplete */
export const ALL_CITY_NAMES = [
  ...Object.keys(CITY_NAME_MAP),
  ...CITY_COORDS.map((c) => c.city),
].filter((v, i, a) => a.indexOf(v) === i); // unique

export function getCoords(city: string): { lat: number; lng: number } | null {
  // Try Chinese name lookup first
  const englishName = CITY_NAME_MAP[city.trim()];
  const searchName = englishName || city.trim();
  const match = CITY_COORDS.find(
    (c) => c.city.toLowerCase() === searchName.toLowerCase()
  );
  return match ? { lat: match.lat, lng: match.lng } : null;
}
