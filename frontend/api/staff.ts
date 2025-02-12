import axios from 'axios';
import { BACKEND_URL } from '../config';
import { Credentials, User } from '../interfaces';
import { Role } from '../types';

export class StaffAPI {
  static async login(credentials: Credentials) {
    const response = await axios.post(
      `${BACKEND_URL}/staff/auth/login`,
      credentials,
      {
        withCredentials: true
      }
    );

    return response;
  }

  static async register(credentials: Credentials) {
    const response = await axios.post(
      `${BACKEND_URL}/staff/auth/register`,
      credentials
    );

    return response;
  }

  static async logout() {
    const response = await axios.get(`${BACKEND_URL}/staff/auth/logout`, {
      withCredentials: true
    });

    return response;
  }

  static async getAll(
    opts: { page?: number; limit?: number } = {},
    cookie?: any
  ) {
    let cookieOpts = {};

    if (cookie) {
      cookieOpts = { headers: { cookie } };
    }

    if (!opts.limit) {
      opts.limit = 0;
    }

    if (opts.page) {
      const staff: User[] = (await axios.get(
        `${BACKEND_URL}/staff?page=${opts.page}&limit=${opts.limit}`,
        {
          withCredentials: true,
          ...cookieOpts
        }
      )).data;

      return staff;
    } else {
      const staff: User[] = (await axios.get(
        `${BACKEND_URL}/staff?limit=${opts.limit}`,
        {
          withCredentials: true,
          ...cookieOpts
        }
      )).data;

      return staff;
    }
  }

  static async updateRole(staffId: string, role: Role) {
    const response = (await axios.put(
      `${BACKEND_URL}/staff/${staffId}`,
      { role },
      {
        withCredentials: true
      }
    )).data;

    return response;
  }

  static async delete(staffId: string) {
    const response = (await axios.delete(`${BACKEND_URL}/staff/${staffId}`, {
      withCredentials: true
    })).data;

    return response;
  }

  static async verify(staffId: string) {
    const response = (await axios.get(`${BACKEND_URL}/confirm/${staffId}`, {
      withCredentials: true
    })).data;

    return response;
  }

  static async isAuthenticated(cookie?: any) {
    let opts = {};

    if (cookie) {
      opts = { headers: { cookie } };
    }

    const auth: {
      user: User | null;
      isAuthenticated: boolean;
    } = (await axios.get(`${BACKEND_URL}/staff/auth`, {
      withCredentials: true,
      ...opts
    })).data;

    return auth;
  }
}
