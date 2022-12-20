import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';

import GlobalStyles from '../GlobalStyles';

import Button from './shared/Button';

interface Props {
  navigation: NavigationProp<any>
}

interface State {
}

export class Home extends React.PureComponent<Props, State> {

  constructor(props: any) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <View style={GlobalStyles.container}>
        <View style={GlobalStyles.content}>
          <View>
            <Text style={GlobalStyles.label}>
              Choose an action
            </Text>
          </View>
          <View style={styles.actions}>
            <Button title='Create New Parent Account' onPress={() => this.props.navigation.navigate('CreateParentAccount')}></Button>
            <Button title='Placeholder' onPress={() => this.props.navigation.navigate('Placeholder')}></Button>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({  
  actions: {
    justifyContent: 'space-evenly',
    marginVertical: 36
  },
});
