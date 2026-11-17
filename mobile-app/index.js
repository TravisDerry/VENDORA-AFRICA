import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { installFetchTimeout } from './src/utils/fetchTimeout';

installFetchTimeout(); // before the app starts making requests

import App from './App';

registerRootComponent(App);
