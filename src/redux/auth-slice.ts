import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  username: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'USER';
}

export interface AuthState {
  registeredUsers: User[];
  activeSessions: { [email: string]: boolean };
  currentUser: User | null;
}

const initialState: AuthState = {
  registeredUsers: [
    {
      username: 'admin_user',
      email: 'admin@domain.com',
      password: 'AdminPassword123!',
      role: 'ADMIN',
    },
  ],
  activeSessions: {},
  currentUser: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    registerUser: (state, action: PayloadAction<User>) => {
      state.registeredUsers.push(action.payload);
    },
    loginUserSuccess: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.activeSessions[action.payload.email.toLowerCase()] = true;
    },
    logoutUser: (state, action: PayloadAction<string>) => {
      state.currentUser = null;
      delete state.activeSessions[action.payload.toLowerCase()];
    },
  },
});

export const { registerUser, loginUserSuccess, logoutUser } = authSlice.actions;
export default authSlice.reducer;
