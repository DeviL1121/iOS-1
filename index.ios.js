'use strict';

var React = require('react-native');
var SettingStore = require('./stores/SettingStore');
var WelcomePage = require('./components/WelcomePage');
var EditPage = require('./components/EditPage');
var PostsPage = require('./components/PostsPage');

var {
  AsyncStorage,
  AppRegistry,
  Navigator
} = React;

class Constellational extends React.Component {
  renderScene(route, nav) {
    switch (route.id) {
      case 'welcome':
        return <WelcomePage navigator={nav} />;
      case 'posts':
        return <PostsPage navigator={nav} />;
      default:
        return <EditPage route={route} navigator={nav} />;
    }
  }

  render() {
    SettingStore.loadSettings();
    return (<Navigator
      initialRoute={{id: 'welcome'}}
      renderScene={this.renderScene}
      configureScene={() => Navigator.SceneConfigs.FloatFromRight}
    />);
  }
}

AppRegistry.registerComponent('Constellational', () => Constellational);
