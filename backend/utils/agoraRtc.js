import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { RtcRole, RtcTokenBuilder } = require("agora-token");

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60;

export function getAgoraRtcConfig() {
  const appId = process.env.AGORA_APP_ID?.trim() || "";
  const appCertificate = process.env.AGORA_APP_CERTIFICATE?.trim() || "";

  if (!appId || !appCertificate) {
    throw new Error("Agora RTC credentials are not configured");
  }

  return { appId, appCertificate };
}

export function buildRtcToken({
  channelName,
  uid,
  expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS,
}) {
  const { appId, appCertificate } = getAgoraRtcConfig();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const privilegeExpiresAt = nowSeconds + expiresInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    Number(uid),
    RtcRole.PUBLISHER,
    privilegeExpiresAt,
  );

  return {
    appId,
    token,
    expiresAt: privilegeExpiresAt,
  };
}

export function createRtcUid() {
  return Math.floor(100000 + Math.random() * 900000000);
}
