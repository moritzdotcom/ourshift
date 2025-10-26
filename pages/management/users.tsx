import DigitalContractsSidebar from '@/components/digitalContracts/sidebar';
import { useState, useEffect } from 'react';
import { ApiGetUsersResponse } from '../api/users';
import axios from 'axios';
import ActiveUserSection from '@/components/digitalContracts/activeUserSection';
import ManagementLayout from '@/layouts/managementLayout';

export default function UsersContracts() {
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<ApiGetUsersResponse>([]);

  const activeUser = users.find((u) => u.id === activeUserId);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await axios.get<ApiGetUsersResponse>('/api/users');
      setUsers(data);
    }
    fetchUsers();
  }, []);

  return (
    <ManagementLayout>
      <div className="flex h-[calc(100vh-56px)]">
        <div className="w-80 shrink-0">
          <DigitalContractsSidebar
            users={users}
            setUsers={setUsers}
            activeUserId={activeUserId}
            setActiveUserId={setActiveUserId}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <ActiveUserSection activeUser={activeUser} setUsers={setUsers} />
        </div>
      </div>
    </ManagementLayout>
  );
}
