import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import * as Icons from "phosphor-react-native";
import { colors, spacingX, spacingY } from "@/constants/theme";

const AttachmentModal = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  const uri = useMemo(() => {
    const raw = params?.uri;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : String(raw);
  }, [params?.uri]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeBtn}
        activeOpacity={0.8}
        onPress={() => router.back()}
      >
        <Icons.XIcon size={22} weight="bold" color={colors.white} />
      </TouchableOpacity>

      {uri ? (
        <View style={styles.imageWrap}>
          <ExpoImage
            source={uri}
            style={styles.image}
            contentFit="contain"
            transition={150}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />
          {loading && (
            <View style={styles.skeleton}>
              <ActivityIndicator color={colors.white} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.skeleton}>
          <ActivityIndicator color={colors.white} />
        </View>
      )}
    </View>
  );
};

export default AttachmentModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  closeBtn: {
    position: "absolute",
    top: spacingY._30,
    right: spacingX._20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrap: { flex: 1 },
  image: { flex: 1, width: "100%" },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});

