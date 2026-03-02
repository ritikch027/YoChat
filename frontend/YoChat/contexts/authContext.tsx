import { login, refresh, register } from "@/services/authService";
import { AuthContextProps, DecodedTokenProps, UserProps } from "@/types";
import { useRouter } from "expo-router";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { connectSocket, disconnectSocket } from "@/socket/socket";

export const AuthContext = createContext<AuthContextProps>({
  token: null,
  user: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateToken: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProps | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadToken();
  }, []);

  const clearStoredAuth = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("refreshToken");
  };

  const loadToken = async () => {
    const storedToken = await AsyncStorage.getItem("token");
    const storedRefreshToken = await AsyncStorage.getItem("refreshToken");
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedTokenProps>(storedToken);
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
          if (storedRefreshToken) {
            try {
              const refreshed = await refresh(storedRefreshToken);
              await updateTokens(refreshed.token, refreshed.refreshToken);
              disconnectSocket();
              await connectSocket();
              gotoHomePage();
              return;
            } catch (e) {
              await clearStoredAuth();
              gotoWelcomePage();
              return;
            }
          } else {
            await clearStoredAuth();
            gotoWelcomePage();
            return;
          }
        }
        setToken(storedToken);
        await connectSocket();
        setUser(decoded.user);
        gotoHomePage();
      } catch (error) {
        await clearStoredAuth();
        gotoWelcomePage();
        console.log("failed to decode token: ", error);
      }
    } else {
      gotoWelcomePage();
    }
  };

  const gotoWelcomePage = () => {
    setTimeout(() => {
      router.replace("/(auth)/Welcome");
    }, 1500);
  };
  const gotoHomePage = () => {
    setTimeout(() => {
      router.replace("/(main)/home");
    }, 1500);
  };

  const updateTokens = async (token: string, refreshToken?: string) => {
    if (!token) return;
    setToken(token);
    await AsyncStorage.setItem("token", token);
    if (refreshToken) await AsyncStorage.setItem("refreshToken", refreshToken);

    const decoded = jwtDecode<DecodedTokenProps>(token);
    setUser(decoded.user);
  };

  const signIn = async (email: string, password: string) => {
    const response = await login(email, password);
    await updateTokens(response.token, response.refreshToken);
    await connectSocket();
    router.replace("/(main)/home");
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    avatar?: string | null
  ) => {
    const response = await register(email, password, name, avatar);
    await updateTokens(response.token, response.refreshToken);
    await connectSocket();
    router.replace("/(main)/home");
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    await clearStoredAuth();
    disconnectSocket();
    router.replace("/(auth)/Welcome");
  };

  return (
    <AuthContext.Provider
      value={{ token, user, signIn, signUp, signOut, updateToken: updateTokens }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
