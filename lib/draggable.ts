import { arrayMove } from '@dnd-kit/sortable';

export function reorder<T>(
  items: T[],
  fromId: string,
  toId: string,
  getId: (x: T) => string
) {
  const oldIndex = items.findIndex((x) => getId(x) === fromId);
  const newIndex = items.findIndex((x) => getId(x) === toId);
  return arrayMove(items, oldIndex, newIndex);
}
