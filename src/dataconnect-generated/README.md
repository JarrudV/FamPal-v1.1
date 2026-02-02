# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllLocations*](#listalllocations)
  - [*GetLocationById*](#getlocationbyid)
- [**Mutations**](#mutations)
  - [*CreateNewLocation*](#createnewlocation)
  - [*UpdateLocationDescription*](#updatelocationdescription)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllLocations
You can execute the `ListAllLocations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllLocations(): QueryPromise<ListAllLocationsData, undefined>;

interface ListAllLocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllLocationsData, undefined>;
}
export const listAllLocationsRef: ListAllLocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllLocations(dc: DataConnect): QueryPromise<ListAllLocationsData, undefined>;

interface ListAllLocationsRef {
  ...
  (dc: DataConnect): QueryRef<ListAllLocationsData, undefined>;
}
export const listAllLocationsRef: ListAllLocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllLocationsRef:
```typescript
const name = listAllLocationsRef.operationName;
console.log(name);
```

### Variables
The `ListAllLocations` query has no variables.
### Return Type
Recall that executing the `ListAllLocations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllLocationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllLocationsData {
  locations: ({
    id: UUIDString;
    name: string;
    address: string;
    type: string;
  } & Location_Key)[];
}
```
### Using `ListAllLocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllLocations } from '@dataconnect/generated';


// Call the `listAllLocations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllLocations();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllLocations(dataConnect);

console.log(data.locations);

// Or, you can use the `Promise` API.
listAllLocations().then((response) => {
  const data = response.data;
  console.log(data.locations);
});
```

### Using `ListAllLocations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllLocationsRef } from '@dataconnect/generated';


// Call the `listAllLocationsRef()` function to get a reference to the query.
const ref = listAllLocationsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllLocationsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.locations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.locations);
});
```

## GetLocationById
You can execute the `GetLocationById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getLocationById(vars: GetLocationByIdVariables): QueryPromise<GetLocationByIdData, GetLocationByIdVariables>;

interface GetLocationByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLocationByIdVariables): QueryRef<GetLocationByIdData, GetLocationByIdVariables>;
}
export const getLocationByIdRef: GetLocationByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getLocationById(dc: DataConnect, vars: GetLocationByIdVariables): QueryPromise<GetLocationByIdData, GetLocationByIdVariables>;

interface GetLocationByIdRef {
  ...
  (dc: DataConnect, vars: GetLocationByIdVariables): QueryRef<GetLocationByIdData, GetLocationByIdVariables>;
}
export const getLocationByIdRef: GetLocationByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getLocationByIdRef:
```typescript
const name = getLocationByIdRef.operationName;
console.log(name);
```

### Variables
The `GetLocationById` query requires an argument of type `GetLocationByIdVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetLocationByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetLocationById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetLocationByIdData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetLocationByIdData {
  location?: {
    id: UUIDString;
    name: string;
    address: string;
    description?: string | null;
    type: string;
  } & Location_Key;
}
```
### Using `GetLocationById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getLocationById, GetLocationByIdVariables } from '@dataconnect/generated';

// The `GetLocationById` query requires an argument of type `GetLocationByIdVariables`:
const getLocationByIdVars: GetLocationByIdVariables = {
  id: ..., 
};

// Call the `getLocationById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getLocationById(getLocationByIdVars);
// Variables can be defined inline as well.
const { data } = await getLocationById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getLocationById(dataConnect, getLocationByIdVars);

console.log(data.location);

// Or, you can use the `Promise` API.
getLocationById(getLocationByIdVars).then((response) => {
  const data = response.data;
  console.log(data.location);
});
```

### Using `GetLocationById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getLocationByIdRef, GetLocationByIdVariables } from '@dataconnect/generated';

// The `GetLocationById` query requires an argument of type `GetLocationByIdVariables`:
const getLocationByIdVars: GetLocationByIdVariables = {
  id: ..., 
};

// Call the `getLocationByIdRef()` function to get a reference to the query.
const ref = getLocationByIdRef(getLocationByIdVars);
// Variables can be defined inline as well.
const ref = getLocationByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getLocationByIdRef(dataConnect, getLocationByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.location);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.location);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateNewLocation
You can execute the `CreateNewLocation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createNewLocation(): MutationPromise<CreateNewLocationData, undefined>;

interface CreateNewLocationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateNewLocationData, undefined>;
}
export const createNewLocationRef: CreateNewLocationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createNewLocation(dc: DataConnect): MutationPromise<CreateNewLocationData, undefined>;

interface CreateNewLocationRef {
  ...
  (dc: DataConnect): MutationRef<CreateNewLocationData, undefined>;
}
export const createNewLocationRef: CreateNewLocationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createNewLocationRef:
```typescript
const name = createNewLocationRef.operationName;
console.log(name);
```

### Variables
The `CreateNewLocation` mutation has no variables.
### Return Type
Recall that executing the `CreateNewLocation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateNewLocationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateNewLocationData {
  location_insert: Location_Key;
}
```
### Using `CreateNewLocation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createNewLocation } from '@dataconnect/generated';


// Call the `createNewLocation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createNewLocation();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createNewLocation(dataConnect);

console.log(data.location_insert);

// Or, you can use the `Promise` API.
createNewLocation().then((response) => {
  const data = response.data;
  console.log(data.location_insert);
});
```

### Using `CreateNewLocation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createNewLocationRef } from '@dataconnect/generated';


// Call the `createNewLocationRef()` function to get a reference to the mutation.
const ref = createNewLocationRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createNewLocationRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.location_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.location_insert);
});
```

## UpdateLocationDescription
You can execute the `UpdateLocationDescription` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateLocationDescription(vars: UpdateLocationDescriptionVariables): MutationPromise<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;

interface UpdateLocationDescriptionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateLocationDescriptionVariables): MutationRef<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;
}
export const updateLocationDescriptionRef: UpdateLocationDescriptionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateLocationDescription(dc: DataConnect, vars: UpdateLocationDescriptionVariables): MutationPromise<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;

interface UpdateLocationDescriptionRef {
  ...
  (dc: DataConnect, vars: UpdateLocationDescriptionVariables): MutationRef<UpdateLocationDescriptionData, UpdateLocationDescriptionVariables>;
}
export const updateLocationDescriptionRef: UpdateLocationDescriptionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateLocationDescriptionRef:
```typescript
const name = updateLocationDescriptionRef.operationName;
console.log(name);
```

### Variables
The `UpdateLocationDescription` mutation requires an argument of type `UpdateLocationDescriptionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateLocationDescriptionVariables {
  id: UUIDString;
  description: string;
}
```
### Return Type
Recall that executing the `UpdateLocationDescription` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateLocationDescriptionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateLocationDescriptionData {
  location_update?: Location_Key | null;
}
```
### Using `UpdateLocationDescription`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateLocationDescription, UpdateLocationDescriptionVariables } from '@dataconnect/generated';

// The `UpdateLocationDescription` mutation requires an argument of type `UpdateLocationDescriptionVariables`:
const updateLocationDescriptionVars: UpdateLocationDescriptionVariables = {
  id: ..., 
  description: ..., 
};

// Call the `updateLocationDescription()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateLocationDescription(updateLocationDescriptionVars);
// Variables can be defined inline as well.
const { data } = await updateLocationDescription({ id: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateLocationDescription(dataConnect, updateLocationDescriptionVars);

console.log(data.location_update);

// Or, you can use the `Promise` API.
updateLocationDescription(updateLocationDescriptionVars).then((response) => {
  const data = response.data;
  console.log(data.location_update);
});
```

### Using `UpdateLocationDescription`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateLocationDescriptionRef, UpdateLocationDescriptionVariables } from '@dataconnect/generated';

// The `UpdateLocationDescription` mutation requires an argument of type `UpdateLocationDescriptionVariables`:
const updateLocationDescriptionVars: UpdateLocationDescriptionVariables = {
  id: ..., 
  description: ..., 
};

// Call the `updateLocationDescriptionRef()` function to get a reference to the mutation.
const ref = updateLocationDescriptionRef(updateLocationDescriptionVars);
// Variables can be defined inline as well.
const ref = updateLocationDescriptionRef({ id: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateLocationDescriptionRef(dataConnect, updateLocationDescriptionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.location_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.location_update);
});
```

