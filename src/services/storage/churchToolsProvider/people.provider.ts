import type { PersonInfo } from '../../../types/entities'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getCurrentUser(): Promise<PersonInfo>
    getPersonInfo(personId: string): Promise<PersonInfo>
    searchPeople(query: string): Promise<PersonInfo[]>
  }
}

ChurchToolsStorageProvider.prototype.getCurrentUser = async function getCurrentUser(
  this: ChurchToolsStorageProvider,
): Promise<PersonInfo> {
  const user = await this.apiClient.getCurrentUser()
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phoneNumber: user.phoneNumber,
  }
}

ChurchToolsStorageProvider.prototype.getPersonInfo = async function getPersonInfo(
  this: ChurchToolsStorageProvider,
  personId: string,
): Promise<PersonInfo> {
  return this.apiClient.getPersonInfo(personId)
}

ChurchToolsStorageProvider.prototype.searchPeople = async function searchPeople(
  this: ChurchToolsStorageProvider,
  query: string,
): Promise<PersonInfo[]> {
  return this.apiClient.searchPeople(query)
}
