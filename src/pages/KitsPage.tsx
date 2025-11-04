/**
 * Kits Page - Main list of equipment kits
 */

import { useState } from 'react';
import { Modal, Stack } from '@mantine/core';
import { KitList } from '../components/kits/KitList';
import { KitForm } from '../components/kits/KitForm';

export function KitsPage() {
  const [createModalOpened, setCreateModalOpened] = useState(false);

  return (
    <Stack gap="md">
      <KitList onCreateClick={() => setCreateModalOpened(true)} />

      <Modal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        title="Neues Equipment-Kit erstellen"
        size="lg"
      >
        <KitForm
          onSuccess={() => setCreateModalOpened(false)}
          onCancel={() => setCreateModalOpened(false)}
        />
      </Modal>
    </Stack>
  );
}
