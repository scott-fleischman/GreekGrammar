import R from 'ramda';
import 'fetch';
import * as State from './state.js';

export const types = R.compose(R.fromPairs, R.map(x => [x,x])) ([
  'requestIndex',
  'receiveIndex',
  'viewWorkList',
  'viewTypeList',
  'requestWork',
  'receiveWork',
  'viewWork',
  'viewValueList',
  'requestType',
  'receiveType',
  'viewInstanceList',
]);

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    const error = new Error(response.statusText);
    error.response = response;
    throw error;
  }
}

function loadData(dataName) {
  return fetch(`data/${dataName}.json`)
    .then(checkStatus)
    .then(x => x.json())
    .catch(x => console.log('Unable to load data', dataName, x));
}

function requestIndex() { return { type: types.requestIndex }; }
function receiveIndex(index) {
  return {
    type: types.receiveIndex,
    index: index,
  };
}

function dispatchFetchData(dispatch, dataName, onRequest, onResponse) {
  dispatch(onRequest());
  return loadData(dataName)
    .then(x => dispatch(onResponse(x)));
}

function fetchIndex(dispatch, getState) {
  if (getState().data.index)
    return Promise.resolve();

  return dispatchFetchData(dispatch, 'index', () => requestIndex(), x => receiveIndex(x));
}

export function viewWorkList() { return { type: types.viewWorkList }; }
export function viewTypeList() { return { type: types.viewTypeList }; }
export function viewWork(workIndex) { return { type: types.viewWork, workIndex }; }
export function viewValueList(typeIndex) { return { type: types.viewValueList, typeIndex }; }
export function viewInstanceList(typeIndex, valueIndex) { return { type: types.viewInstanceList, typeIndex, valueIndex }; }

export const fetchViewWorkList = () => (dispatch, getState) => fetchIndex(dispatch, getState).then(() => dispatch(viewWorkList()));
export const fetchViewTypeList = () => (dispatch, getState) => fetchIndex(dispatch, getState).then(() => dispatch(viewTypeList()));

function requestWork(workIndex) { return { type: types.requestWork, workIndex }; }
function receiveWork(workIndex, work) { return { type: types.receiveWork, workIndex, work }; }
function fetchWork(dispatch, getState, workIndex) {
  if (State.hasWork(getState(), workIndex))
    return Promise.resolve();

  return dispatchFetchData(dispatch, `works/work${workIndex}`, () => requestWork(workIndex), x => receiveWork(workIndex, x));
}

function requestType(typeIndex) { return { type: types.requestType, typeIndex }; }
function receiveType(typeIndex, typeData) { return { type: types.receiveType, typeIndex, typeData }; }
function fetchType(dispatch, getState, typeIndex) {
  if (State.hasValues(getState(), typeIndex))
    return Promise.resolve();

  return dispatchFetchData(dispatch, `types/type${typeIndex}`, () => requestType(typeIndex), x => receiveType(typeIndex, x));
}

export const fetchViewWork = workIndex => (dispatch, getState) =>
  fetchIndex(dispatch, getState)
  .then(() => fetchWork(dispatch, getState, workIndex))
  .then(() => dispatch(viewWork(workIndex)));

export const fetchViewValueList = typeIndex => (dispatch, getState) =>
  fetchIndex(dispatch, getState)
  .then(() => dispatch(viewValueList(typeIndex)));

export const fetchViewInstanceList = (typeIndex, valueIndex) => (dispatch, getState) =>
  fetchIndex(dispatch, getState)
  .then(() => fetchType(dispatch, getState, typeIndex))
  .then(() => dispatch(viewInstanceList(typeIndex, valueIndex)));
