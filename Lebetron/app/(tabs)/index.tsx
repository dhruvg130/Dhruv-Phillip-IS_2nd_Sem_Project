import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Home</Text>
      <Text>Welcome to your front page 👋</Text>
    </View>
  );
}
