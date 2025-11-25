import type { Migration } from './types'
import { schemaMigrationV1_0_0_to_v1_1_0 } from './migrations/v1.0.0-to-v1.1.0'
import { schemaMigrationV1_1_0_to_v1_2_0 } from './migrations/v1.1.0-to-v1.2.0'

export const registeredMigrations: Migration[] = [
	schemaMigrationV1_0_0_to_v1_1_0,
	schemaMigrationV1_1_0_to_v1_2_0,
]
