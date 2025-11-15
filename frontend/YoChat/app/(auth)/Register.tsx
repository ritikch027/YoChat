import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useContext, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import { useAuth } from "@/contexts/authContext";

const Register = () => {
  const nameRef = useRef("");
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [isSecure, setIsSecure] = useState(true);
  
  const {signUp}=useAuth();

  const handleSubmit = async () => {
    if (!nameRef.current || !emailRef.current || !passwordRef.current) {
      Alert.alert("Sign Up", "Please fill all the fields");
      return;
    }
    try{
      setIsLoading(true);
      await signUp(emailRef.current,passwordRef.current,nameRef.current,"")
    }catch(err:any){
      Alert.alert("Registration Error",err.message);
    }finally{
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS == "ios" ? "padding" : "height"}
    >
      <ScreenWrapper bgOpacity={0.5} showPattern={true}>
        <View style={styles.container}>
          <View style={styles.header}>
            <BackButton iconSize={28} />
            <Typo size={17} color={colors.white}>
              Need some help?
            </Typo>
          </View>
          <View style={styles.content}>
            <ScrollView
              contentContainerStyle={styles.form}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: spacingY._10, marginBottom: spacingY._15 }}>
                <Typo size={28} fontWeight={"600"}>
                  Getting Started
                </Typo>
                <Typo color={colors.neutral600}>
                  Create an account to continue...
                </Typo>
              </View>
              <Input
                placeholder="Enter your name"
                onChangeText={(value: string) => (nameRef.current = value)}
                icon={
                  <Icons.UserIcon
                    size={verticalScale(26)}
                    color={colors.neutral600}
                  />
                }
              />
              <Input
                placeholder="Enter your email"
                onChangeText={(value: string) => (emailRef.current = value)}
                icon={
                  <Icons.AtIcon
                    size={verticalScale(26)}
                    color={colors.neutral600}
                  />
                }
              />
              <Input
                placeholder="Enter your password"
                onChangeText={(value: string) => (passwordRef.current = value)}
                secureTextEntry={isSecure}
                rightIcon={
                  isSecure ? (
                    <TouchableOpacity onPress={() => setIsSecure(false)}>
                      <Icons.EyeClosedIcon
                        size={verticalScale(26)}
                        color={colors.neutral600}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setIsSecure(true)}>
                      <Icons.EyeIcon
                        size={verticalScale(26)}
                        color={colors.neutral600}
                      />
                    </TouchableOpacity>
                  )
                }
                icon={
                  <Icons.LockIcon
                    size={verticalScale(26)}
                    color={colors.neutral600}
                  />
                }
              />
              <View style={{ marginTop: spacingY._25, gap: spacingY._15 }}>
                <Button loading={isLoading} onPress={handleSubmit}>
                  <Typo fontWeight={"bold"} size={18} color={colors.black}>
                    Sign Up
                  </Typo>
                </Button>
              </View>
              <View style={styles.footer}>
                <Typo color={colors.neutral600}>Already have an account?</Typo>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/Login")}
                >
                  <Typo color={colors.primaryDark} fontWeight={"bold"}>
                    Log In
                  </Typo>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._15,
    paddingBottom: spacingY._25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius._50,
    borderTopRightRadius: radius._50,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._20,
  },
  form: {
    gap: spacingY._15,
    marginTop: spacingY._20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
});
