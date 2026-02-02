import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateNewLocationData {
  location_insert: Location_Key;
}

export interface EventInvitation_Key {
  eventId: UUIDString;
  userId: UUIDString;
  __typename?: 'EventInvitation_Key';
}

export interface Event_Key {
  id: UUIDString;
  __typename?: 'Event_Key';
}

export interface Favorite_Key {
  userId: UUIDString;
  locationId: UUIDString;
  __typename?: 'Favorite_Key';
}

export interface GetLocationByIdData {
  location?: {
    id: UUIDString;
    name: string;
    address: string;
    description?: string | null;
    type: string;
  } & Location_Key;
}

export interface GetLocationByIdVariables {
  id: UUIDString;
}

export interface GroupMembership_Key {
  groupId: UUIDString;
  userId: UUIDString;
  __typename?: 'GroupMembership_Key';
}

export interface Group_Key {
  id: UUIDString;
  __typename?: 'Group_Key';
}

export interface ListAllLocationsData {
  locations: ({
    id: UUIDString;
    name: string;
    address: string;
    type: string;
  } & Location_Key)[];
}

export interface Location_Key {
  id: UUIDString;
  __typename?: 'Location_Key';
}

export interface Memory_Key {
  id: UUIDString;
  __typename?: 'Memory_Key';
}

export interface UpdateLocationDescriptionData {
  location_update?: Location_Key | null;
}

export interface UpdateLocationDescriptionVariables {
  id: UUIDString;
  description: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateNewLocationRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateNewLocationData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateNewLocationData, undefined>;
  operationName: string;
}
export const createNewLocationRef: CreateNewLocationRef;

export function createNewLocation(): MutationPromise<CreateNewLocationData, undefined>;
export function createNewLocation(dc: DataConnect): MutationPromise<CreateNewLocationData, undefined>;

interface ListAllLocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllLocationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllLocationsData, undefined>;
  operationName: string;
}
export const listAllLocationsRef: ListAllLocationsRef;

export function listAllLocations(): QueryPromise<ListAllLocationsData, undefined>;
export function listAllLocations(dc: DataConnect): QueryPromise<ListAllLocationsData, undefined>;

interface UpdateLocationDescriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateLocationDescriptionVariables): MutationRef<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateLocationDescriptionVariables): MutationRef<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;
  operationName: string;
}
export const updateLocationDescriptionRef: UpdateLocationDescriptionRef;

export function updateLocationDescription(vars: UpdateLocationDescriptionVariables): MutationPromise<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;
export function updateLocationDescription(dc: DataConnect, vars: UpdateLocationDescriptionVariables): MutationPromise<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;

interface GetLocationByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLocationByIdVariables): QueryRef<GetLocationByIdData, GetLocationByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetLocationByIdVariables): QueryRef<GetLocationByIdData, GetLocationByIdVariables>;
  operationName: string;
}
export const getLocationByIdRef: GetLocationByIdRef;

export function getLocationById(vars: GetLocationByIdVariables): QueryPromise<GetLocationByIdData, GetLocationByIdVariables>;
export function getLocationById(dc: DataConnect, vars: GetLocationByIdVariables): QueryPromise<GetLocationByIdData, GetLocationByIdVariables>;

