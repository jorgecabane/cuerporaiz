import type { LiveClass } from "@/lib/domain";

export interface LayoutBlock {
  liveClass: LiveClass;
  topPercent: number;
  heightPercent: number;
  column: number;
  totalColumns: number;
}

/**
 * Google Calendar-style column packing for overlapping events.
 * Groups overlapping classes into clusters, assigns columns within
 * each cluster, and computes width/offset for side-by-side rendering.
 */
export function layoutBlocks(
  classes: LiveClass[],
  startHour: number,
  totalHours: number,
): LayoutBlock[] {
  if (classes.length === 0) return [];

  const items = classes.map((c) => {
    const start = new Date(c.startsAt);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = startMin + c.durationMinutes;
    const topPercent = ((startMin / 60 - startHour) / totalHours) * 100;
    const heightPercent = (c.durationMinutes / 60 / totalHours) * 100;
    return {
      liveClass: c,
      startMin,
      endMin,
      topPercent,
      heightPercent,
      column: 0,
      totalColumns: 1,
    };
  });

  items.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  function processCluster(startIdx: number, endIdx: number) {
    const columns: number[] = []; // tracks end-minute of last event in each column

    for (let i = startIdx; i < endIdx; i++) {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (items[i].startMin >= columns[col]) {
          items[i].column = col;
          columns[col] = items[i].endMin;
          placed = true;
          break;
        }
      }
      if (!placed) {
        items[i].column = columns.length;
        columns.push(items[i].endMin);
      }
    }

    const totalCols = columns.length;
    for (let i = startIdx; i < endIdx; i++) {
      items[i].totalColumns = totalCols;
    }
  }

  let clusterEnd = items[0].endMin;
  let clusterStartIdx = 0;

  for (let i = 1; i < items.length; i++) {
    if (items[i].startMin < clusterEnd) {
      clusterEnd = Math.max(clusterEnd, items[i].endMin);
    } else {
      processCluster(clusterStartIdx, i);
      clusterStartIdx = i;
      clusterEnd = items[i].endMin;
    }
  }

  processCluster(clusterStartIdx, items.length);

  return items.map(({ liveClass, topPercent, heightPercent, column, totalColumns }) => ({
    liveClass,
    topPercent,
    heightPercent,
    column,
    totalColumns,
  }));
}
