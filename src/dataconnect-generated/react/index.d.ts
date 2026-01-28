import { CreateNewLocationData, ListAllLocationsData, UpdateLocationDescriptionData, UpdateLocationDescriptionVariables, GetLocationByIdData, GetLocationByIdVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateNewLocation(options?: useDataConnectMutationOptions<CreateNewLocationData, FirebaseError, void>): UseDataConnectMutationResult<CreateNewLocationData, undefined>;
export function useCreateNewLocation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewLocationData, FirebaseError, void>): UseDataConnectMutationResult<CreateNewLocationData, undefined>;

export function useListAllLocations(options?: useDataConnectQueryOptions<ListAllLocationsData>): UseDataConnectQueryResult<ListAllLocationsData, undefined>;
export function useListAllLocations(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllLocationsData>): UseDataConnectQueryResult<ListAllLocationsData, undefined>;

export function useUpdateLocationDescription(options?: useDataConnectMutationOptions<UpdateLocationDescriptionData, FirebaseError, UpdateLocationDescriptionVariables>): UseDataConnectMutationResult<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;
export function useUpdateLocationDescription(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateLocationDescriptionData, FirebaseError, UpdateLocationDescriptionVariables>): UseDataConnectMutationResult<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;

export function useGetLocationById(vars: GetLocationByIdVariables, options?: useDataConnectQueryOptions<GetLocationByIdData>): UseDataConnectQueryResult<GetLocationByIdData, GetLocationByIdVariables>;
export function useGetLocationById(dc: DataConnect, vars: GetLocationByIdVariables, options?: useDataConnectQueryOptions<GetLocationByIdData>): UseDataConnectQueryResult<GetLocationByIdData, GetLocationByIdVariables>;
