import { configureStore } from '@reduxjs/toolkit';
import countSlice from 'features/countSlice.store';

export default configureStore({
  reducer: {
    count: countSlice,
  }
})