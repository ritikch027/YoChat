// app/(main)/username.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../../contexts/authContext"; // adjust path if different
import { checkUsername, updateMyUsername } from "@/services/usernameService";
import { useRouter } from "expo-router";

const DEBOUNCE_MS = 400;

export default function UsernameScreen() {
  const { user, token, updateToken } = useAuth();
  const router = useRouter();

  const [value, setValue] = useState(user?.username || "");
  const [status, setStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid"
  >("idle");
  const [message, setMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // live availability check
  useEffect(() => {
    if (!value) {
      setStatus("idle");
      setMessage("Leave empty to remove your username.");
      return;
    }

    setStatus("checking");
    setMessage("Checking username…");

    const id = setTimeout(async () => {
      try {
        const res = await checkUsername(value);
        const current = user?.username?.toLowerCase();

        if (!res.isValid) {
          setStatus("invalid");
          setMessage("Invalid username format.");
        } else if (!res.isAvailable && res.username.toLowerCase() !== current) {
          setStatus("taken");
          setMessage("This username is already taken.");
        } else {
          setStatus("ok");
          setMessage("Username is available ✅");
        }
      } catch (err) {
        setStatus("idle");
        setMessage("Error checking username.");
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [value, user?.username]);

  const onSave = async () => {
    if (!token) {
      Alert.alert("Error", "You are not logged in.");
      return;
    }

    try {
      setSaving(true);
      const res = await updateMyUsername(token, value || null);

      if (!res.success) {
        Alert.alert("Error", res.error || "Failed to update username");
        return;
      }

      // if backend returns a fresh token (recommended)
      if (res.token) {
        await updateToken(res.token);
      }

      Alert.alert("Success", "Username updated!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.log("update username error:", err);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const disabled =
    saving || (value !== "" && (status === "taken" || status === "invalid"));

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 4 }}>
        Username
      </Text>

      <Text style={{ color: "#666", marginBottom: 10 }}>
        This is your public YoChat handle. Others can find you by this instead
        of your email.
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 8,
        }}
      >
        <Text style={{ fontSize: 16, marginRight: 4 }}>@</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="username"
          autoCapitalize="none"
          style={{ flex: 1, fontSize: 16 }}
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {status === "checking" && <ActivityIndicator size="small" />}
        <Text style={{ color: "#666" }}>{message}</Text>
      </View>

      <Pressable
        onPress={onSave}
        disabled={disabled}
        style={{
          marginTop: 20,
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          backgroundColor: disabled ? "#ccc" : "#007bff",
        }}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
        )}
      </Pressable>

      <Text style={{ marginTop: 16, fontSize: 12, color: "#888" }}>
        Your profile link will be:
        {"\n"}
        <Text style={{ fontWeight: "500" }}>
          https://yochat.app/@{value || "yourname"}
        </Text>
      </Text>
    </View>
  );
}
