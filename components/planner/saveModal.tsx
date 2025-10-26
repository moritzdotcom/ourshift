import { computeDiff } from '@/lib/planner';
import { Modal, Group, Button, Text } from '@mantine/core';

export default function PlannerSaveModal({
  opened,
  unsaved,
  employeeName,
  codeLabel,
  onSave,
  onCancel,
}: {
  opened: boolean;
  unsaved: ReturnType<typeof computeDiff>;
  employeeName: (id: string) => string;
  codeLabel: (id: string) => string;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      opened={opened}
      onClose={() => {
        /* bewusst leer lassen, damit man explizit entscheidet */
      }}
      title="Ungespeicherte Änderungen"
      centered
      size="lg"
    >
      <Text c="dimmed" size="sm" mb="sm">
        Du hast {unsaved.length} ungespeicherte Änderung(en). Möchtest du sie
        vorher speichern?
      </Text>

      <div className="max-h-64 overflow-auto border rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-2 py-1 text-left">Datum</th>
              <th className="px-2 py-1 text-left">Mitarbeiter</th>
              <th className="px-2 py-1 text-left">Von</th>
              <th className="px-2 py-1 text-left">Nach</th>
            </tr>
          </thead>
          <tbody>
            {unsaved.map((c) => {
              const d = new Date(c.y, c.m, c.d);
              return (
                <tr key={c.key} className="border-t">
                  <td className="px-2 py-1">{d.toLocaleDateString()}</td>
                  <td className="px-2 py-1">
                    {/* optional: Mitarbeitername mappen */}
                    {employeeName(c.userId)}
                  </td>
                  <td className="px-2 py-1">{codeLabel(c.fromCodeId)}</td>
                  <td className="px-2 py-1">{codeLabel(c.toCodeId)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Group justify="end" mt="md">
        <Button variant="default" onClick={onCancel}>
          Verwerfen & verlassen
        </Button>
        <Button onClick={onSave}>Jetzt speichern</Button>
      </Group>
    </Modal>
  );
}
