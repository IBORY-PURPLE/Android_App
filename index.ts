import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// 홈 화면 위젯(react-native-android-widget) 태스크 핸들러 등록 — 조건부 분리 로드.
// 위젯은 개발 빌드에서만 실제 동작한다. Expo Go에는 이 네이티브 모듈이 없고,
// 환경에 따라 라이브러리 로드 자체가 throw할 수 있어(TurboModuleRegistry.getEnforcing)
// 지연 require + try/catch로 감싼다 — 실패해도 앱 본체(Expo Go)는 그대로 돈다.
try {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch {
  // Expo Go 등 위젯 네이티브 모듈이 없는 환경 — 위젯 없이 앱만 구동한다.
}
