import { Empty, Typography } from 'antd';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { dayLabel } from '../lib/constants';
import { HKU_CENTER, resolveVenue } from '../lib/venues';
import type { Subclass } from '../types/course';
import 'leaflet/dist/leaflet.css';

interface BuildingGroup {
  key: string;
  name: string;
  latlng: [number, number];
  entries: string[];
}

/** 视野自适应:单点 setView,多点 fitBounds。 */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 17);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points).pad(0.3));
    }
  }, [map, points]);
  return null;
}

interface CourseVenueMapProps {
  subclasses: Subclass[];
}

/**
 * 上课地点地图:把该课程所有课次按教学楼聚合,一楼一个标记点。
 * 使用 divIcon 自绘圆形标记,规避打包器下 Leaflet 默认图标路径 404 的问题。
 */
export default function CourseVenueMap({ subclasses }: CourseVenueMapProps) {
  const { groups, unlocated } = useMemo(() => {
    const byBuilding = new Map<string, BuildingGroup>();
    let unlocatedCount = 0;

    for (const subclass of subclasses) {
      const section = subclass.section ?? '—';
      for (const slot of subclass.slots) {
        const building = resolveVenue(slot.venue);
        if (!building) {
          unlocatedCount += 1;
          continue;
        }
        const entry = `${section} · ${dayLabel(slot.day)} ${slot.startTime}–${slot.endTime} · ${slot.venue}`;
        const existing = byBuilding.get(building.key);
        if (existing) {
          existing.entries.push(entry);
        } else {
          byBuilding.set(building.key, {
            key: building.key,
            name: building.name,
            latlng: [building.lat, building.lng],
            entries: [entry],
          });
        }
      }
    }

    return { groups: Array.from(byBuilding.values()), unlocated: unlocatedCount };
  }, [subclasses]);

  const points = useMemo(() => groups.map((group) => group.latlng), [groups]);

  if (groups.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可标注的上课地点" />;
  }

  return (
    <div>
      <MapContainer center={HKU_CENTER} zoom={17} scrollWheelZoom className="venue-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {groups.map((group) => (
          <Marker
            key={group.key}
            position={group.latlng}
            icon={L.divIcon({
              className: 'venue-pin-wrapper',
              html: `<div class="venue-pin"><span class="venue-pin__key">${group.key}</span><span class="venue-pin__count">${group.entries.length}</span></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 40],
              popupAnchor: [0, -32],
            })}
          >
            <Popup>
              <div className="venue-popup">
                <strong>{group.name}</strong>
                {group.entries.map((entry) => (
                  <div key={entry}>{entry}</div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
      {unlocated > 0 && (
        <Typography.Text type="secondary" className="venue-map__note">
          另有 {unlocated} 个课次未标注地点(地点待定)
        </Typography.Text>
      )}
    </div>
  );
}
