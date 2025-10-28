import KioskPinModal from '@/components/kiosk/pinModal';
import KioskShiftCard from '@/components/kiosk/shiftCard';
import { KioskStopModal } from '@/components/kiosk/stopModal';
import useKioskData, { KioskShift } from '@/hooks/useKioskData';
import { Box, Stack, Text, Button } from '@mantine/core';
import { IconLockOpen, IconMaximize } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

// Fullscreen Helper
function requestFullscreenEl() {
  const el = document.documentElement;
  if (el.requestFullscreen) {
    return el.requestFullscreen();
  }
  const webkitReq = (el as any).webkitRequestFullscreen;
  if (webkitReq) {
    return webkitReq.call(el);
  }
  return Promise.reject(new Error('Fullscreen API not available'));
}

export default function KioskPage() {
  const { shifts, handlePunch } = useKioskData();

  const [exitOpen, setExitOpen] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const timeStr = now.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return !!(
      document.fullscreenElement || (document as any).webkitFullscreenElement
    );
  });

  useEffect(() => {
    function handleFsChange() {
      const active =
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement;
      setIsFullscreen(active);
    }
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  async function enterFullscreen() {
    try {
      await requestFullscreenEl();
    } catch (err) {
      console.warn('Fullscreen konnte nicht aktiviert werden:', err);
    }
  }

  // PIN Modal State
  const [pinOpen, setPinOpen] = useState(false);
  const [activeShiftForPin, setActiveShiftForPin] = useState<KioskShift | null>(
    null
  );

  const handleOpenPinForShift = (shift: KioskShift) => {
    setActiveShiftForPin(shift);
    setPinOpen(true);
  };

  return (
    <Box
      style={{
        backgroundColor: '#000',
        color: 'white',
        width: '100%',
        minHeight: '100dvh',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Box
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 10,
        }}
      >
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconLockOpen size={16} stroke={1.5} />}
          styles={{
            root: {
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 500,
              padding: '0.4rem 0.6rem',
              height: 'auto',
            },
            label: {
              lineHeight: 1.2,
            },
          }}
          onClick={() => setExitOpen(true)}
        >
          Kiosk verlassen
        </Button>
      </Box>
      {/* Fullscreen Button */}
      {!isFullscreen && (
        <Box
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
          }}
        >
          <Button
            onClick={enterFullscreen}
            leftSection={<IconMaximize size={18} stroke={1.5} />}
            radius="md"
            size="sm"
            variant="light"
            color="gray"
            styles={{
              root: {
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
              },
              label: { fontWeight: 500 },
            }}
          >
            Vollbild starten
          </Button>
        </Box>
      )}

      {/* Uhr / Datum */}
      <Box
        style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}
      >
        <Text
          style={{
            fontSize: '6rem',
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: '-0.03em',
            color: 'white',
          }}
        >
          {timeStr}
        </Text>
        <Text
          style={{
            fontSize: '1.5rem',
            lineHeight: 1.4,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'capitalize',
          }}
        >
          {dateStr}
        </Text>
      </Box>

      {/* Alle relevanten Schichten (aktive + nächste) */}
      <Stack gap="lg">
        {shifts.map((shift) => (
          <KioskShiftCard
            key={shift.id}
            shift={shift}
            onPunch={handleOpenPinForShift}
          />
        ))}
      </Stack>

      {/* PIN Modal (global, aber weiß für welche Schicht über activeShiftForPin) */}
      <KioskPinModal
        opened={pinOpen}
        onClose={() => {
          setPinOpen(false);
          setActiveShiftForPin(null);
        }}
        shift={activeShiftForPin}
        handlePunch={handlePunch}
      />

      {/* Footer Branding */}
      <Box
        style={{
          marginTop: 'auto',
          textAlign: 'center',
          paddingTop: '2rem',
          opacity: 0.4,
          fontSize: '0.75rem',
          color: 'white',
        }}
      >
        <Text>OurShift Kiosk</Text>
      </Box>
      <KioskStopModal opened={exitOpen} onClose={() => setExitOpen(false)} />
    </Box>
  );
}
