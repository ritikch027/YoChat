import axios from "axios";
import { API_URL } from "../constants/index";
export type CheckUsernameResponse = {
  username: string;
  isValid: boolean;
  isAvailable: boolean;
  reason: string;
};

export const checkUsername = async (
  username: string
): Promise<CheckUsernameResponse> => {
  const res = await axios.get(`${API_URL}/api/username/check`, {
    params: { username },
  });
  return res.data;
};

export const updateMyUsername = async (
  token: string,
  username: string | null
): Promise<{
  error: string;
  success: boolean;
  user: any;
  token?: string;
}> => {
  const res = await axios.patch(
    `${API_URL}/api/me/username`,
    { username: username ?? "" },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};


export interface UserSearchResult {
  _id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
}

export const searchUsers = async (
  token: string,
  q: string
): Promise<UserSearchResult[]> => {
  const res = await axios.get(`${API_URL}/users/search`, {
    params: { q },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data.users as UserSearchResult[];
};