import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'fampals',
  location: 'us-east4'
};

export const createNewLocationRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewLocation');
}
createNewLocationRef.operationName = 'CreateNewLocation';

export function createNewLocation(dc) {
  return executeMutation(createNewLocationRef(dc));
}

export const listAllLocationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllLocations');
}
listAllLocationsRef.operationName = 'ListAllLocations';

export function listAllLocations(dc) {
  return executeQuery(listAllLocationsRef(dc));
}

export const updateLocationDescriptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateLocationDescription', inputVars);
}
updateLocationDescriptionRef.operationName = 'UpdateLocationDescription';

export function updateLocationDescription(dcOrVars, vars) {
  return executeMutation(updateLocationDescriptionRef(dcOrVars, vars));
}

export const getLocationByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetLocationById', inputVars);
}
getLocationByIdRef.operationName = 'GetLocationById';

export function getLocationById(dcOrVars, vars) {
  return executeQuery(getLocationByIdRef(dcOrVars, vars));
}

