const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'fampals',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createNewLocationRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewLocation');
}
createNewLocationRef.operationName = 'CreateNewLocation';
exports.createNewLocationRef = createNewLocationRef;

exports.createNewLocation = function createNewLocation(dc) {
  return executeMutation(createNewLocationRef(dc));
};

const listAllLocationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllLocations');
}
listAllLocationsRef.operationName = 'ListAllLocations';
exports.listAllLocationsRef = listAllLocationsRef;

exports.listAllLocations = function listAllLocations(dc) {
  return executeQuery(listAllLocationsRef(dc));
};

const updateLocationDescriptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateLocationDescription', inputVars);
}
updateLocationDescriptionRef.operationName = 'UpdateLocationDescription';
exports.updateLocationDescriptionRef = updateLocationDescriptionRef;

exports.updateLocationDescription = function updateLocationDescription(dcOrVars, vars) {
  return executeMutation(updateLocationDescriptionRef(dcOrVars, vars));
};

const getLocationByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetLocationById', inputVars);
}
getLocationByIdRef.operationName = 'GetLocationById';
exports.getLocationByIdRef = getLocationByIdRef;

exports.getLocationById = function getLocationById(dcOrVars, vars) {
  return executeQuery(getLocationByIdRef(dcOrVars, vars));
};
