import DigitalContractsSidebar from '@/components/digitalContracts/sidebar';
import ActiveUserSection from '@/components/digitalContracts/activeUserSection';
import ManagementLayout from '@/layouts/managementLayout';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ApiGetUsersResponse } from '../api/users';
import { Button, Group } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

export default function UsersContracts() {
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<ApiGetUsersResponse>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeUser = users.find((u) => u.id === activeUserId);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await axios.get<ApiGetUsersResponse>('/api/users');
      setUsers(data);
    }
    fetchUsers();
  }, []);

  function handleSelectUser(userId: string) {
    setActiveUserId(userId);
    setSidebarOpen(false);
  }

  return (
    <ManagementLayout>
      <div className="h-[calc(100vh-56px)] flex flex-col md:flex-row overflow-hidden">
        <div
          className={`
            md:block md:w-80 md:shrink-0
            ${sidebarOpen ? 'block' : 'hidden'}
            w-full h-full overflow-y-auto`}
        >
          <DigitalContractsSidebar
            users={users}
            setUsers={setUsers}
            activeUserId={activeUserId}
            setActiveUserId={handleSelectUser}
          />
        </div>

        <div
          className={`
            flex-1 overflow-y-auto
            ${sidebarOpen ? 'hidden md:block' : 'block'}
            bg-white
          `}
        >
          <div className="md:hidden border-b border-gray-200 p-3 bg-slate-100 sticky top-0 z-100">
            <Group gap="sm" justify="space-between" wrap="nowrap">
              <Button
                variant="subtle"
                size="compact-sm"
                color="gray"
                leftSection={<IconArrowLeft size={16} stroke={1.5} />}
                styles={{
                  root: {
                    paddingLeft: '0.5rem',
                    paddingRight: '0.5rem',
                    height: '2rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#111',
                  },
                  section: {
                    marginRight: '0.4rem',
                  },
                }}
                onClick={() => {
                  setSidebarOpen(true);
                }}
              >
                Alle Mitarbeiter
              </Button>

              <div className="text-sm font-medium text-gray-800 truncate max-w-[60%] text-right">
                {activeUser
                  ? `${activeUser.firstName ?? ''} ${
                      activeUser.lastName ?? ''
                    }`.trim()
                  : 'Kein Nutzer gewählt'}
              </div>
            </Group>
          </div>

          <div className="p-4 md:p-6 bg-slate-50">
            <ActiveUserSection activeUser={activeUser} setUsers={setUsers} />
          </div>
        </div>
      </div>
    </ManagementLayout>
  );
}
