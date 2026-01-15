'use client';

import { PIN_TYPE_CONFIG, DoorKnockPinType } from '@/lib/types/door-knock';
import { Card } from '@/components/ui/card';

interface MapLegendProps {
  stats?: Record<DoorKnockPinType, number>;
}

export function MapLegend({ stats }: MapLegendProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Pin Legend</h3>
      <div className="space-y-2">
        {Object.entries(PIN_TYPE_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
            </div>
            {stats && (
              <span className="text-muted-foreground">
                {stats[key as DoorKnockPinType] || 0}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
