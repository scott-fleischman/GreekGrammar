import React from 'react';
import { connect } from 'react-redux'
import * as Action from './action.js'
import * as State from './state.js';
import { WorkList } from './workList.js';
import { Nav } from './nav.js';
import R from 'ramda';
import { Work } from './render.js';
import QueryString from 'query-string';

function getUrl(action) {
  const visual = State.getVisual(action);
  const queryString = QueryString.stringify(visual);
  return `#${queryString}`;
}

export const onHashChange = dispatch => newHash => {
  const visual = QueryString.parse(newHash);
  const action = State.getActionForVisual(visual);
  dispatch(action);
}

const loadingText = 'Loading…';
const loadingItemText = item => `Loading ${item} …`

function getLoadingIndex() {
  return {
    navTitle: loadingText,
    content: (<div></div>),
  };
}

function getLoadingWork(workIndex, works) {
  const text = works ? loadingItemText(works[workIndex].title) : loadingText;
  return {
    navTitle: text,
    content: (<div></div>),
  };
}

function getViewWorkList(works, getWorkUrl) {
  return {
    navTitle: `${works.length} Greek Works, ${R.compose(R.sum, R.map(x => x.wordCount))(works)} Words`,
    content: (<WorkList works={works} getWorkUrl={getWorkUrl} />),
  };
}

function getViewTypeList(types) {
  return {
    navTitle: `${types.length} Types`,
    content: (<div></div>),
  };
}

function getViewWork(workTitle, workIndex, work) {
  return {
    navTitle: workTitle,
    content: (<Work workIndex={workIndex} work={work} />),
  };
}

const App = ({ dispatch, visual, data }) => {
  const viewWork = x => dispatch(Action.fetchViewWork(x));

  let info = null;
  switch (visual.view) {
    case State.view.loadingIndex: info = getLoadingIndex(); break;
    case State.view.loadingWork: info = getLoadingWork(visual.workIndex, data.index.works); break;
    case State.view.workList: info = getViewWorkList(data.index.works, R.compose(getUrl, Action.viewWork)); break;
    case State.view.typeList: info = getViewTypeList(data.index.types); break;
    case State.view.work: info = getViewWork(data.index.works[visual.workIndex].title, visual.workIndex, data.works.get(visual.workIndex)); break;
  }
  if (!info) {
    console.log('Unknown view', visual.view);
    return (<div>Internal error</div>);
  }

  console.log('action.viewWorkList URL', getUrl(Action.viewWorkList()));
  return (
    <div>
      <Nav
        title={info.navTitle}
        workListUrl={getUrl(Action.viewWorkList())}
        typeListUrl={getUrl(Action.viewTypeList())}
        />
      {info.content}
    </div>
  );
};

function select(state) {
  return {
    visual: state.visual,
    data: state.data,
  };
}

export default connect(select)(App);
