import { Router } from "expo-router";
import { ReactNode } from "react";
import {
  StyleProp,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";

export type TypoProps = {
  size?: number;
  color?: string;
  fontWeight?: TextStyle["fontWeight"];
  children: any | null;
  style?: StyleProp<TextStyle>;
  textProps?: TextProps;
  variant?: "chat_message" | "chat_meta" | "title" | "body";
};

export interface UserProps {
  email: string;
  name: string;
  avatar?: string | null;
  id?: string;
  username?: string | null;
  // Add any additional fields from the token payload as needed
}
export interface UserDataProps {
  name: string;
  email: string;
  avatar?: any;
  username?: string;
}

export interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  secureTextEntry?: boolean;
  inputRef?: React.RefObject<TextInput>;
  rightIcon?: React.ReactNode;
  //   label?: string;
  //   error?: string;
}

export interface DecodedTokenProps {
  user: UserProps;
  exp: number;
  iat: number;
}

export type AuthContextProps = {
  token: string | null;
  user: UserProps | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    avatar?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateToken: (token: string) => Promise<void>;
};

export type ScreenWrapperProps = {
  style?: ViewStyle;
  children: React.ReactNode;
  isModal?: boolean;
  showPattern?: boolean;
  bgOpacity?: number;
};

export type ResponseProps = {
  success: boolean;
  data?: any;
  msg?: string;
  message?: string;
  requestId?: string | null;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export interface ButtonProps extends TouchableOpacityProps {
  style?: ViewStyle;
  onPress?: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export type BackButtonProps = {
  style?: ViewStyle;
  color?: string;
  iconSize?: number;
};

export type AvatarProps = {
  size?: number;
  uri: string | null;
  style?: ViewStyle;
  isGroup?: boolean;
};

export type HeaderProps = {
  title?: string;
  style?: ViewStyle;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export type ConversationListItemProps = {
  item: ConversationProps;
  showDivider: boolean;
  isGroup?: boolean;
  router: Router;
};

export type ConversationProps = {
  _id: string;
  type: "direct" | "group";
  avatar: string | null;
  participants: {
    _id: string;
    name: string;
    avatar: string;
    email: string;
    username?: string | null;
  }[];
  name?: string;
  lastMessage?: {
    _id: string;
    content: string;
    senderId: string;
    type: "text" | "image" | "file";
    attachment?: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type MessageProps = {
  id: string;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
  content: string;
  attachment?: string | null;
  reactions?: MessageReaction[];
  replyTo?: string | null;
  replySnapshot?: {
    id: string;
    senderName: string;
    content: string;
    attachment?: string;
    createdAt?: string | null;
  } | null;
  isMe?: boolean;
  createdAt: string;
};

export type MessageReaction = {
  emoji: string;
  userIds: string[];
};

export type CallMediaType = "audio" | "video";
export type CallDirection = "incoming" | "outgoing";
export type CallStatus =
  | "ringing"
  | "connecting"
  | "active"
  | "rejected"
  | "missed"
  | "ended";

export type CallPeer = {
  id: string;
  name: string;
  avatar?: string | null;
};

export type CallSessionPayload = {
  callId: string;
  conversationId: string;
  channelName: string;
  mediaType: CallMediaType;
  direction: CallDirection;
  status: CallStatus;
  statusLabel: string;
  rtcUid: number;
  rtcToken: string;
  appId?: string;
  tokenExpiresAt?: number;
  peer: CallPeer;
  startedAt?: string | null;
  createdAt?: string | null;
};

export type CallInvitePayload = {
  conversationId: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string | null;
  mediaType: CallMediaType;
};

export type CallContextValue = {
  currentCall: CallSessionPayload | null;
  remoteRtcUid: number | null;
  localJoined: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
  placeCall: (payload: CallInvitePayload) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  endCurrentCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
};
