var APIURL = 'https://1dhhcnzmxi.execute-api.us-east-1.amazonaws.com/v1';
var HEADERS = {'Accept': 'application/json', 'Content-Type': 'application/json'};
var USER_URL = 'https://s3.amazonaws.com/constellational-store';
var POST_URL = 'https://d2nxl7qthm5fu1.cloudfront.net';

var SettingStore = require('../stores/SettingStore');
var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var React = require('react-native');

var {
    AsyncStorage,
} = React;


var CHANGE_EVENT = 'change';

var _posts = null;
var _postURLs = null;
var _requests = [];

function retryFailedRequests() {
  var promiseArr = _requests.map((req) => {
    if (req.stat !== 'succeeded') {
      return fetch(req.url, req.params).then(res => res.json()).then(req.callback).then(() => {
        req.stat = 'succeeded';
        return req;
      }).catch(() => {
        req.stat = 'failed';
        return req;
      });
    } else {
      return req;
    }
  });
  Promise.all(promiseArr).then((res) => {
    _requests = res;
  });
}

function addRequest(url, params, callback) {
  _requests.push({url: url, params: params, callback: callback});
  retryFailedRequests();
}

function loadAsyncStore() {
  return AsyncStorage.getItem('posts').then(str => {
    if (!str) _posts = {};
    else _posts = JSON.parse(str);
    return AsyncStorage.getItem('postURLs').then(str => {
      if (!str) _postURLs = [];
      else _postURLs = JSON.parse(str);
      PostStore.emitChange();
    });
  });
}

function createPost(post) {
  post.created = new Date().toISOString();
  post.updated = post.created;
  if (!post.id) post.id = post.created;
  post.key = post.created;
  post.url = post.key;
  _postURLs.unshift(post.url);
  _posts[post.url] = post;
  PostStore.emitChange();
 
  var username = SettingStore.getUsername();
  var url = APIURL + '/' + username;
  post.token = SettingStore.getToken();
  var params = {method: 'POST', body: JSON.stringify(post), headers: HEADERS};

  var callback = (createdPost) => {
    delete _posts[post.url];
    var i = _postURLs.indexOf(post.url);
    _postURLs.splice(i, 1);
    _postURLs.unshift(createdPost.url);
    _posts[createdPost.url] = createdPost;
    PostStore.emitChange();
    return updateAsyncStore();
  };

  addRequest(url, params, callback);
}
      
function editPost(post) {
  var i = _postURLs.indexOf(post.url);
  var initialURL = post.url;
  _postURLs.splice(i, 1);
  _postURLs.unshift(post.url);
  _posts[post.url] = post;
  PostStore.emitChange();

  var username = SettingStore.getUsername();
  var key = post.key;
  if (!key) key = post.created + post.id;
  var url = APIURL + '/' + username + '/' + key;
  post.token = SettingStore.getToken();
  var params = {method: 'PUT', body: JSON.stringify(post), headers: HEADERS};

  var callback = (post) => {
    delete _posts[initialURL];
    _postURLs.splice(i, 1);
    _postURLs.unshift(post.url);
    _posts[url] = post;
    PostStore.emitChange();
    return updateAsyncStore();
  };
  
  addRequest(url, params, callback);
}

function deletePost(post) {
  var i = _postURLs.indexOf(post.url);
  _postURLs.splice(i, 1);
  delete _posts[post.url];
  PostStore.emitChange();
 
  var username = SettingStore.getUsername();
  var token = SettingStore.getToken();
  var body = JSON.stringify({token: token});
  var key = post.key;
  if (!key) key = post.created + post.id;
  var url = APIURL + '/' + username + '/' + key;
  var params = {method: 'DELETE', body: body, headers: HEADERS};
  
  addRequest(url, params, updateAsyncStore);
}

function fetchUser(username) {
  return fetch(USER_URL + '/' + username).then(res => res.json());
}

function fetchPost(username, url) {
  return fetch(POST_URL + '/' + username + '/' + url).then(res => res.json()).then((post) => {
    post.url = url;
    return post;
  });
}

function fetchFromServer() {
  var username = SettingStore.getUsername();
  return fetchUser(username).then((user) => {
    _postURLs = user.posts;
    var promiseArr = user.posts.map(url => fetchPost(username, url));
    return Promise.all(promiseArr);
  }).then((posts) => {
    posts.map((post) => {
      _posts[post.url] = post;
    });
    PostStore.emitChange();
  });
} 

function updateAsyncStore() {
  return AsyncStorage.setItem('posts', JSON.stringify(_posts)).then(() => {
    if (_postURLs) return AsyncStorage.setItem('postURLs', JSON.stringify(_postURLs));
  }).catch(err => {
    console.log("couldn't store post: " + err);
  });
}
   
var PostStore = assign({}, EventEmitter.prototype, {
  getAll: function() {
    if (!_postURLs) {
      loadAsyncStore().then(fetchFromServer).then(updateAsyncStore);
      return [];
    } else {
      _postURLs = _postURLs.filter(url => (!!url));
      return _postURLs.map(url => _posts[url]);
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
    case 'create-post':
      createPost(action.post);
      break;

    case 'edit-post':
      editPost(action.post);
      break;

    case 'delete-post':
      deletePost(action.post);
      break;

  }
});

module.exports = PostStore;
