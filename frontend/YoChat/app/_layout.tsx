import { AuthProvider } from "@/contexts/authContext";
import { CallProvider } from "@/contexts/callContext";
import { ThemeProvider } from "@/contexts/themeContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <CallProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </CallProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
