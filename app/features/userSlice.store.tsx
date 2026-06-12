import { createSlice } from '@reduxjs/toolkit';

export const userSlice = createSlice({
  name: 'userInfo',
  initialState: { userData: null },
  reducers: {
    setUserData: (state, action) => {
      console.log('setUserData', action.payload);
      state.userData = action.payload;
      localStorage.setItem('userData', JSON.stringify(action.payload));
    },
    clearUserData: (state) => {
      state.userData = null;
      localStorage.removeItem('userData');
    }
  }
});

export const { setUserData } = userSlice.actions

export default userSlice.reducer