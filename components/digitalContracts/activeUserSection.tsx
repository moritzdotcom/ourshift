import {
  AppShell,
  Card,
  Group,
  Button,
  Badge,
  Stack,
  Divider,
  Accordion,
  Text,
  Anchor,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconEdit,
  IconCalendar,
  IconCalendarCancel,
  IconMail,
  IconPhone,
  IconCancel,
} from '@tabler/icons-react';
import { useMemo, Dispatch, SetStateAction, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { dateSortDesc, dateToHuman, dateToISO } from '@/lib/dates';
import UserModal from '@/components/digitalContracts/userModal';
import { DigitalContract, User } from '@/generated/prisma';
import { ApiGetUsersResponse } from '@/pages/api/users';
import ContractModal from '@/components/digitalContracts/contractModal';
import ContractItem from './contractItem';
import PayRulesSection from './payRulesSection';
import { showError, showSuccess } from '@/lib/toast';
import { axiosErrorToString } from '@/lib/error';
import CancelContractModal, {
  CancelContractPayload,
} from './cancelContractModal';

export default function ActiveUserSection({
  activeUser,
  setUsers,
}: {
  activeUser: ApiGetUsersResponse[number] | undefined;
  setUsers: Dispatch<SetStateAction<ApiGetUsersResponse>>;
}) {
  const [modalOpened, { open: openUserModal, close: closeUserModal }] =
    useDisclosure(false);

  // NEW: Contract modal state
  const [
    contractOpened,
    { open: openContractModal, close: closeContractModal },
  ] = useDisclosure(false);

  const [
    cancelContractOpened,
    { open: openCancelContractModal, close: closeCancelContractModal },
  ] = useDisclosure(false);

  const [cancelContractLoading, setCancelContractLoading] = useState(false);
  const [contractMode, setContractMode] = useState<'create' | 'edit'>('create');
  const [contractInitial, setContractInitial] =
    useState<Partial<DigitalContract> | null>(null);

  const contracts = activeUser?.contracts || [];
  const today = dateToISO(new Date());

  const current = useMemo(() => {
    return (
      contracts.find((contract) => {
        const validFrom = dateToISO(contract.validFrom);
        const validUntil = contract.validUntil
          ? dateToISO(contract.validUntil)
          : null;

        return validFrom <= today && (!validUntil || validUntil >= today);
      }) || null
    );
  }, [contracts, today]);

  const past = useMemo(
    () =>
      contracts
        .filter(
          (contract) =>
            contract.validUntil && dateToISO(contract.validUntil) < today,
        )
        .sort((a, b) => dateSortDesc(a.validFrom, b.validFrom)),
    [contracts, today],
  );

  // --------- USER UPDATE (bereits vorhanden) ----------
  async function handleUpdate(
    user: Partial<typeof activeUser> & {
      id?: string;
      password?: string;
      kioskPin?: string;
    },
  ) {
    if (!user.id) return;

    try {
      const { data } = await axios.put<User>(`/api/users/${user.id}`, user);
      setUsers((us) =>
        us.map((u) => (u.id === data.id ? { ...u, ...data } : u)),
      );
      showSuccess('Änderungen gespeichert');
      closeUserModal();
    } catch (error) {
      if (isAxiosError(error)) {
        showError(axiosErrorToString(error));
      }
    }
  }

  // --------- CONTRACT CREATE / EDIT ----------
  function openCreateContract() {
    if (!activeUser) return;
    setContractMode('create');
    // Prefill aus aktuellem Vertrag (falls vorhanden):
    setContractInitial(
      current
        ? {
            ...current,
            id: undefined,
            validFrom: new Date(),
            validUntil: null,
          }
        : {
            userId: activeUser.id,
            validFrom: new Date(),
            validUntil: null,
            salaryMonthlyCents: null,
            hourlyRateCents: null,
            vacationDaysAnnual: null,
            weeklyHours: null,
          },
    );
    openContractModal();
  }

  function openEditCurrent() {
    if (!activeUser || !current) return;
    setContractMode('edit');
    setContractInitial({ ...current, userId: activeUser.id });
    openContractModal();
  }

  async function saveContract(payload: Partial<DigitalContract>) {
    if (!activeUser) return;

    if (contractMode === 'create') {
      const { data } = await axios.post(
        `/api/users/${activeUser.id}/contracts`,
        {
          contract: payload,
          closeCurrent: true,
        },
      );
      // server sollte aktualisierte contracts zurückgeben (oder einzelnen neuen + evtl. aktualisierten alten)
      const updatedContracts = data;
      setUsers((us) =>
        us.map((u) =>
          u.id === activeUser.id ? { ...u, contracts: updatedContracts } : u,
        ),
      );
      showSuccess('Arbeitsbedingungen hinzugefügt');
    } else {
      const { data } = await axios.put(
        `/api/users/${activeUser.id}/contracts/${payload.id}`,
        payload,
      );
      const updated = data;
      setUsers((us) =>
        us.map((u) =>
          u.id === activeUser.id
            ? {
                ...u,
                contracts: (u.contracts || []).map((c) =>
                  c.id === updated.id ? updated : c,
                ),
              }
            : u,
        ),
      );
      showSuccess('Arbeitsbedingungen gespeichert');
    }
    closeContractModal();
  }

  function openCancelContract() {
    if (!activeUser || !current) return;
    openCancelContractModal();
  }

  async function cancelCurrentContract(payload: CancelContractPayload) {
    if (!activeUser || !current) return;

    setCancelContractLoading(true);

    try {
      const { data } = await axios.post<{
        contract: DigitalContract;
        terminationDate: string;
        deletedShiftsCount: number;
      }>(`/api/users/${activeUser.id}/contracts/${current.id}/cancel`, payload);

      setUsers((users) =>
        users.map((user) =>
          user.id === activeUser.id
            ? {
                ...user,
                terminationDate: data.terminationDate as any,
                contracts: (user.contracts || []).map((contract) =>
                  contract.id === data.contract.id ? data.contract : contract,
                ),
              }
            : user,
        ),
      );

      closeCancelContractModal();

      if (data.deletedShiftsCount > 0) {
        showSuccess(
          `Arbeitsverhältnis beendet. ${data.deletedShiftsCount} geplante ${
            data.deletedShiftsCount === 1 ? 'Schicht wurde' : 'Schichten wurden'
          } gelöscht.`,
        );
      } else {
        showSuccess('Arbeitsverhältnis wurde beendet.');
      }
    } catch (error) {
      if (isAxiosError(error)) {
        showError(axiosErrorToString(error));
      } else {
        showError('Das Arbeitsverhältnis konnte nicht beendet werden.');
      }
    } finally {
      setCancelContractLoading(false);
    }
  }

  return (
    <div className="w-full p-4">
      {!activeUser ? (
        <Text c="dimmed">Bitte Mitarbeiter wählen…</Text>
      ) : (
        <Stack gap="lg" className="max-w-5xl mx-auto">
          {/* Header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <div className="text-2xl font-bold">
                {activeUser.firstName} {activeUser.lastName}
              </div>

              {/* Rolle & Status */}
              <Group gap="xs" mt={4}>
                <Badge>{activeUser.role}</Badge>
                <Badge color={activeUser.isActive ? 'green' : 'gray'}>
                  {activeUser.isActive ? 'aktiv' : 'inaktiv'}
                </Badge>
              </Group>

              {/* PROFIL-INFOS */}
              <Group gap="md" mt="8" wrap="wrap">
                <Group gap={6}>
                  <IconMail size={16} />
                  {activeUser.email ? (
                    <Anchor size="sm" href={`mailto:${activeUser.email}`}>
                      {activeUser.email}
                    </Anchor>
                  ) : (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  )}
                </Group>

                <Group gap={6}>
                  <IconPhone size={16} />
                  <Text size="sm">
                    {activeUser.phone || (
                      <span className="text-slate-400">—</span>
                    )}
                  </Text>
                </Group>

                <Group gap={6}>
                  <IconCalendar size={16} />
                  <Text size="sm">
                    Beginn:&nbsp;
                    {activeUser.employmentStart
                      ? dateToHuman(activeUser.employmentStart)
                      : '—'}
                  </Text>
                </Group>

                <Group gap={6}>
                  <IconCalendarCancel size={16} />
                  <Text size="sm">
                    Austritt:&nbsp;
                    {activeUser.terminationDate
                      ? dateToHuman(activeUser.terminationDate)
                      : '—'}
                  </Text>
                </Group>
              </Group>
            </div>

            <Group>
              <Button variant="default" onClick={openUserModal}>
                Profil bearbeiten
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={openCreateContract}
              >
                {current ? 'Vertragsänderung hinzufügen' : 'Vertrag hinzufügen'}
              </Button>
            </Group>
          </Group>

          <UserModal
            opened={modalOpened}
            onClose={closeUserModal}
            onSave={handleUpdate}
            initial={activeUser}
          />

          {/* Aktuelle Vereinbarungen */}
          <Card withBorder radius="lg" p="md">
            <Group justify="space-between" mb="xs">
              <div className="font-semibold">Aktuelle Vereinbarungen</div>
              <Group>
                {current && (
                  <Button
                    size="xs"
                    leftSection={<IconEdit size={14} />}
                    onClick={openEditCurrent}
                  >
                    Aktuellen Vertrag bearbeiten
                  </Button>
                )}
                {current && (
                  <Button
                    size="xs"
                    color="red"
                    leftSection={<IconCancel size={14} />}
                    onClick={openCancelContract}
                  >
                    Arbeitsverhältnis beenden
                  </Button>
                )}
              </Group>
            </Group>
            <Divider mb="md" />
            {current ? (
              <ContractItem contract={current} />
            ) : (
              <Text c="dimmed">Keine aktuelle Vereinbarung vorhanden.</Text>
            )}
          </Card>

          {activeUser && (
            <PayRulesSection
              user={activeUser}
              onLocalChange={(next) => {
                setUsers((list) =>
                  list.map((u) =>
                    u.id === activeUser.id ? { ...u, payRules: next } : u,
                  ),
                );
              }}
            />
          )}

          {/* Frühere Vereinbarungen */}
          <Card withBorder radius="lg" p="md">
            <div className="font-semibold mb-2">Frühere Vereinbarungen</div>
            <Divider mb="md" />
            {past.length === 0 ? (
              <Text c="dimmed">Keine früheren Vereinbarungen.</Text>
            ) : (
              <Accordion chevronPosition="left">
                {past.map((c) => (
                  <Accordion.Item key={c.id} value={c.id}>
                    <Accordion.Control>
                      {dateToHuman(c.validFrom)} - {dateToHuman(c.validUntil)}
                    </Accordion.Control>
                    <Accordion.Panel>
                      <ContractItem contract={c} />
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </Card>

          {/* CONTRACT MODAL */}
          {activeUser && (
            <ContractModal
              opened={contractOpened}
              onClose={closeContractModal}
              mode={contractMode}
              initial={contractInitial}
              userId={activeUser.id}
              onSubmit={saveContract}
            />
          )}

          {activeUser && (
            <CancelContractModal
              opened={cancelContractOpened}
              onClose={closeCancelContractModal}
              contract={current}
              loading={cancelContractLoading}
              onSubmit={cancelCurrentContract}
            />
          )}
        </Stack>
      )}
    </div>
  );
}
