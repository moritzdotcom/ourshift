import { useState } from 'react';
import { Button, Tooltip } from '@mantine/core';
import { IconLogin2, IconLogout, IconUserPlus } from '@tabler/icons-react';
import { motion, AnimatePresence, Transition } from 'framer-motion';

export default function PunchTakeoverSwitcher({
  shift,
  isRunning,
  punchLabel, // "Einstempeln" | "Ausstempeln"
  onPunch, // (shift) => void
  onTakeover, // (shift) => void
}: {
  shift: any;
  isRunning: boolean;
  punchLabel: string;
  onPunch: (s: any) => void;
  onTakeover: (s: any) => void;
}) {
  const [takeoverExpanded, setTakeoverExpanded] = useState(false);

  const spring: Transition = { type: 'spring', stiffness: 320, damping: 28 };
  const baseBtnStyle = {
    color: 'white',
    fontSize: '1.2rem',
    fontWeight: 600,
    height: '4rem',
    marginTop: '1rem',
  } as const;

  if (isRunning) {
    // Nur ein großer Austempeln-Button
    return (
      <div className="w-full flex gap-4">
        <div className="basis-full">
          <Button
            fullWidth
            radius="md"
            style={{ ...baseBtnStyle, backgroundColor: '#ef4444' }}
            leftSection={<IconLogout />}
            onClick={() => onPunch(shift)}
          >
            {punchLabel}
          </Button>
        </div>
      </div>
    );
  }

  function handlePunchButtonClick() {
    if (takeoverExpanded) {
      setTakeoverExpanded(false);
    } else {
      onPunch(shift);
    }
  }

  function handleTakeoverButtonClick() {
    if (takeoverExpanded) {
      onTakeover(shift);
    } else {
      setTakeoverExpanded(true);
    }
  }

  // Nicht laufend: zwei Slots, wir animieren die Breite via flex-basis
  return (
    <div className="w-full flex gap-4">
      {/* Linker Slot: "primär" – entweder Einstempeln (groß) ODER Übernehmen (groß) */}
      <motion.div
        className="shrink-0"
        initial={false}
        animate={{ flexBasis: takeoverExpanded ? '17%' : '80%' }}
        transition={spring}
        style={{ minWidth: 0 }} // verhindert Layout-Jumps bei Text
      >
        <Button
          fullWidth
          radius="md"
          style={{
            ...baseBtnStyle,
            backgroundColor: '#10b981', // blau=Übernehmen, grün=Einstempeln
          }}
          leftSection={takeoverExpanded ? null : <IconLogin2 />}
          onClick={handlePunchButtonClick}
          title={punchLabel}
        >
          {/* Label weich ein-/ausblenden, damit der Textwechsel nicht ruckelt */}
          <div className="flex items-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {takeoverExpanded ? (
                <motion.span
                  key="takeover"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <IconLogin2 />
                </motion.span>
              ) : (
                <motion.span
                  key="clockin"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {punchLabel}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Button>
      </motion.div>

      {/* Rechter Slot: "sekundär" – immer icon-only. Klick toggelt die Ansicht. */}
      <motion.div
        className="shrink-0"
        initial={false}
        animate={{ flexBasis: takeoverExpanded ? '80%' : '17%' }}
        transition={spring}
        style={{ minWidth: 0 }} // verhindert Layout-Jumps bei Text
      >
        <Button
          fullWidth
          radius="md"
          style={{
            ...baseBtnStyle,
            backgroundColor: '#0ea5e9',
          }}
          leftSection={takeoverExpanded ? <IconUserPlus /> : null}
          onClick={handleTakeoverButtonClick}
          title="Schicht übernehmen"
        >
          {/* Label weich ein-/ausblenden, damit der Textwechsel nicht ruckelt */}
          <div className="flex items-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {takeoverExpanded ? (
                <motion.span
                  key="takeover"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  Schicht übernehmen
                </motion.span>
              ) : (
                <motion.span
                  key="clockin"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <IconUserPlus />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Button>
      </motion.div>
    </div>
  );
}
