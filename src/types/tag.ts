import type { ISOTimestamp, UUID } from './entities';

export interface Tag {
  id: UUID;
  name: string;
  color: string;
  description?: string;
  createdBy: UUID;
  createdByName?: string;
  createdAt: ISOTimestamp;
}

export interface InheritedTag {
  tagId: UUID;
  sourceType: 'kit' | 'model';
  sourceId: UUID;
  sourceName: string;
}
