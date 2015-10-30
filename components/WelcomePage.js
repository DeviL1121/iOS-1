'use strict'

var URL = 'https://d1w3fhkxysfgcn.cloudfront.net';

var SettingActions = require('../actions/SettingActions');
var SettingStore = require('../stores/SettingStore');
var React = require('react-native');

var Heading = require('./Heading');
var Subheading = require('./Subheading');
var BigButton = require('./BigButton');

var {
  StyleSheet,
  Text,
  TextInput,
  View,
  LinkingIOS,
} = React;

class WelcomePage extends React.Component {
  constructor(props, context) {
    super(props);
    this.state = {
      heading: 'Constellational',
      subheading: 'Welcome!'
    };
    var url = LinkingIOS.popInitialURL();
    if (url) this.handleOpenURL({url});
    this.signup = this.signup.bind(this);
    this.onSettingStoreChange = this.onSettingStoreChange.bind(this);
    this.getStarted = this.getStarted.bind(this);
    this.renderBottomSection = this.renderBottomSection.bind(this);
  } 

  componentDidMount() {
    SettingStore.addChangeListener(this.onSettingStoreChange);
    LinkingIOS.addEventListener('url', this.handleOpenURL);
  }

  componentWillUnmount() {
    SettingStore.removeChangeListener(this.onSettingStoreChange);
    LinkingIOS.removeEventListener('url', this.handleOpenURL);
  }

  getStarted() {
    this.props.navigator.immediatelyResetRouteStack([{id: 'posts'}, {id: 'edit'}]);
  }

  handleOpenURL(event) {
    var b64 = event.url.split('token=')[1];
    var token = JSON.parse(base64url.decode(b64));
    this.setState({heading: 'Welcome Back!', subheading: 'Signing you in'});
    SettingActions.authenticate(token);
  }

  checkUsername() {
    return fetch(URL + '/' + this.state.username).then((res) => {
      if (res.status !== 404) {
        this.setState({
          isUsernameAvailable: false,
          heading: 'Try another username', 
          subheading: 'This one seems to be taken!'
        });
      } else {
        this.setState({isUsernameAvailable: true});
      }
    });
  }

  signup() {
    this.setState({heading: 'Signing you up'});
    SettingActions.signup(this.state.username, this.state.email);
  }

  signin() {
    this.setState({heading: 'Sending you a signin email!', subheading: 'Please click the link in the email to sign in'});
    SettingActions.signin(this.state.username, this.state.email);
  }

  onSettingStoreChange() {
    if (this.state.isSigningUp) {
      var usernameStatus = SettingStore.getUsernameStatus();
      if (usernameStatus === 'unavailable') {
        this.setState({heading: 'Try another username', subheading: 'This one seems to be taken!'});
      } else if (usernameStatus === 'available') {
        this.setState({heading: 'Yay! You\'re all set', subheading: 'Time to write something', success: true});
      }
    } else {
      var emailStatus = SettingStore.getEmailStatus();
      if (emailStatus !== 'sent') this.signin();
      else {
        var token = SettingStore.getToken();
        if (token) this.props.navigator.immediatelyResetRouteStack([{id: 'posts'}]);
      }
    }
  }

  renderBottomSection() {
    if (this.state.success) {
      return(<BigButton onPress={this.getStarted} text={'Get Started'} />);
    } else if (this.state.username && (this.state.isSigningIn || this.state.isUsernameAvailable)) {
      this.setState({subheading: "What's your email address?"});
      return (<TextInput
        key='email'
        keyboardType='email-address'
        returnKeyType='join'
        style={styles.textBox}
        placeholder='email address'
        autoFocus={true}
        onSubmitEditing={(event) => {
          this.setState({email: event.nativeEvent.text});
          if (this.state.isSigningUp) this.signup();
          else this.signin();
        }}
      />);
    } else if (this.state.isSigningIn || this.state.isSigningUp) {
      return (<TextInput
        key='username'
        keyboardType='url'
        returnKeyType='next'
        autoFocus={true}
        style={styles.textBox}
        placeholder='username' 
        onSubmitEditing={(event) => {
          this.setState({username: event.nativeEvent.text});
          if (this.state.isSigningUp) {
            this.setState({subheading: 'Checking your username'});
            this.checkUsername();
          }
        }}
      />);
    } else {
      var signupState = {isSigningUp: true, heading: 'Welcome!', subheading: 'Pick a username'};
      var signinState = {isSigningIn: true, heading: 'Welcome Back!', subheading: "What's your username?"};
      return (<View>
        <BigButton onPress={() => this.setState(signupState)} text={'Sign up'} />
        <Subheading onPress={() => this.setState(signinState)} text={'Already Signed Up?'} />
      </View>);
    }
  }

  render() {
    return (
      <View style={styles.page}>
        <Heading text={this.state.heading} />
        <Subheading text={this.state.subheading} />
        <View style={styles.bottomSection}>
          {this.renderBottomSection()}
        </View>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBox: {
    alignSelf: 'center',
    margin: 10,
    height: 46,
    width: 150,
    textAlign: 'center',
    borderWidth: 0.5,
    borderColor: 'black',
    borderRadius: 5,
  },
  bottomSection: {
    marginBottom: 120,
  },
});

module.exports = WelcomePage;
