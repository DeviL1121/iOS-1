import React from 'react-native';
import { EventEmitter } from 'events';
import assign from 'object-assign';

import AppDispatcher from '../dispatcher/AppDispatcher';

const {
    AsyncStorage,
} = React;

const CHANGE_EVENT = 'change';

let _history = null;

function loadAsyncStore() {
  return AsyncStorage.getItem('history').then(str => {
    if (!str) _history = {};
    else _history = JSON.parse(str);
    HistoryStore.emitChange();
  });
}

function updateAsyncStore() {
  return AsyncStorage.setItem('history', JSON.stringify(_history)).catch((err) => {
    console.log("couldn't store history: " + err);
  });
}
   
let HistoryStore = assign({}, EventEmitter.prototype, {
  get: function() {
    if (!_history) {
      loadAsyncStore();
      return [];
    } else {
      var history = Object.keys(_history).map(url => _history[url]);
      var sorted = history.sort((a, b) => {
        if (a.timestamps[0] > b.timestamps[0]) return -1;
        else if (a.timestamps[0] < b.timestamps[0]) return 1;
        else return 0;
      });
      return sorted;
    }
  },

  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },

  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }
});

AppDispatcher.register(function(action) {
  switch(action.actionType) {
    case 'add-to-history':
      let visit = action.visit;
      let timestamp = new Date().toISOString();
      if (!_history) _history = {};
      if (_history[visit.url]) {
        _history[visit.url].timestamps.unshift(timestamp);
      } else {
        visit.timestamps = [timestamp];
        _history[visit.url] = visit;
      }
      HistoryStore.emitChange();
      updateAsyncStore();
      break;
  }
});

export default HistoryStore;
