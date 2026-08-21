import { createSlice } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  userRole: 'admin' | 'student' | null;
  userEmail: string | null;
}

const initialState: AuthState = {
  isAuthenticated: true, 
  userRole: 'admin',     
  userEmail: 'Admin@gmail.com',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginAdmin: (state: AuthState) => {
      state.isAuthenticated = true;
      state.userRole = 'admin';
    },
    logoutUser: (state: AuthState) => {
      state.isAuthenticated = false;
      state.userRole = null;
    },
  },
});

export const { loginAdmin, logoutUser } = authSlice.actions;
export default authSlice.reducer;