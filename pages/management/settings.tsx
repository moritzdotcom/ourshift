import React, { useEffect, useState } from 'react';
import { Tabs, Button } from '@mantine/core';
import ShiftCodesSection from '@/components/settings/shiftCodes/section';
import { Holiday, ShiftCode } from '@/generated/prisma';
import RulesSection from '@/components/settings/paymentRules/section';
import HolidaysSection from '@/components/settings/holidays/section';
import axios from 'axios';
import ManagementLayout from '@/layouts/managementLayout';
import { ApiGetPayRulesResponse } from '../api/payRules';

export default function SettingsPage() {
  const [rules, setRules] = useState<ApiGetPayRulesResponse>([]);
  const [shiftCodes, setShiftCodes] = useState<ShiftCode[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    const fetchRules = async () => {
      const { data } = await axios.get<ApiGetPayRulesResponse>('/api/payRules');
      setRules(data);
    };
    const fetchHolidays = async () => {
      const { data } = await axios.get<Holiday[]>('/api/holidays');
      setHolidays(data);
    };
    const fetchShiftCodes = async () => {
      const { data } = await axios.get<ShiftCode[]>('/api/shiftCodes');
      setShiftCodes(data);
    };
    fetchRules();
    fetchHolidays();
    fetchShiftCodes();
  }, []);

  return (
    <ManagementLayout>
      <div className="w-full p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Einstellungen</h1>
            </div>
            <p className="text-slate-600">
              Zuschlagsregeln, Schicht-Typen und Feiertage verwalten
            </p>
          </div>

          <Tabs
            defaultValue="rules"
            className="rounded-2xl bg-white p-4 shadow-sm border"
          >
            <Tabs.List grow>
              <Tabs.Tab value="rules">Zuschläge</Tabs.Tab>
              <Tabs.Tab value="shiftcodes">Schicht-Typen</Tabs.Tab>
              <Tabs.Tab value="holidays">Feiertage</Tabs.Tab>
            </Tabs.List>

            {/* Zuschläge */}
            <Tabs.Panel value="rules" pt="md">
              <RulesSection
                rules={rules}
                onCreate={(r) => setRules((prev) => [...prev, r])}
                onUpdate={(r) =>
                  setRules((prev) => prev.map((x) => (x.id === r.id ? r : x)))
                }
                onDelete={(id) =>
                  setRules((prev) => prev.filter((x) => x.id !== id))
                }
              />
            </Tabs.Panel>

            {/* ShiftCodes */}
            <Tabs.Panel value="shiftcodes" pt="md">
              <ShiftCodesSection
                items={shiftCodes}
                onCreate={(sc) => setShiftCodes((p) => [...p, sc])}
                onUpdate={(sc) =>
                  setShiftCodes((p) => p.map((x) => (x.id === sc.id ? sc : x)))
                }
                onDelete={(id) =>
                  setShiftCodes((p) => p.filter((x) => x.id !== id))
                }
                setShiftCodes={setShiftCodes}
              />
            </Tabs.Panel>

            {/* Feiertage */}
            <Tabs.Panel value="holidays" pt="md">
              <HolidaysSection
                items={holidays}
                onCreate={(h) => setHolidays((p) => [...p, h])}
                onDelete={(id) =>
                  setHolidays((p) => p.filter((x) => x.id !== id))
                }
              />
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>
    </ManagementLayout>
  );
}
