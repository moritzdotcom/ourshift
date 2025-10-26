import { dateTimeToHuman } from '@/lib/dates';
import { Group, Text } from '@mantine/core';

export default function ChangeRequestDiffRow({
  label,
  oldValue,
  newValue,
}: {
  label: string;
  oldValue?: Date | string | null;
  newValue?: Date | string | null;
}) {
  const changed = Boolean(
    newValue &&
      oldValue &&
      new Date(newValue).getTime() !== new Date(oldValue).getTime()
  );
  const onlyNew = newValue && !oldValue; // edge-case, falls alt leer
  const onlyOld = oldValue && !newValue; // bei dir wohl nicht der Fall, aber robust

  return (
    <Group gap="sm" align="baseline" wrap="wrap">
      <Text fw={600} w={120}>
        {label}
      </Text>
      <div className="flex flex-col sm:flex-row sm:gap-3">
        {changed && (
          <Text c="dimmed" td="line-through">
            {dateTimeToHuman(oldValue!)}
          </Text>
        )}
        {onlyOld && <Text c="dimmed">{dateTimeToHuman(oldValue!)}</Text>}
        {onlyNew && (
          <Text fw={600} c="green">
            {dateTimeToHuman(newValue!)}
          </Text>
        )}
        {!changed && !onlyNew && !onlyOld && (
          <Text>{dateTimeToHuman(oldValue || newValue)}</Text>
        )}
        {changed && (
          <Text fw={700} c="green">
            {dateTimeToHuman(newValue!)}
          </Text>
        )}
      </div>
    </Group>
  );
}
