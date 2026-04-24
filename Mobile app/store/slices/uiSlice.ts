import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  mode: 'simple' | 'modern';
  fontSize: 'normal' | 'large';
}

const initialState: UIState = {
  mode: 'modern', // Default to modern, user can switch
  fontSize: 'normal',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setInterfaceMode: (state, action: PayloadAction<'simple' | 'modern'>) => {
      state.mode = action.payload;
      // Auto-adjust font size based on mode if needed, but keep it flexible
      if (action.payload === 'simple') {
        state.fontSize = 'large';
      } else {
        state.fontSize = 'normal';
      }
    },
    setFontSize: (state, action: PayloadAction<'normal' | 'large'>) => {
      state.fontSize = action.payload;
    },
  },
});

export const { setInterfaceMode, setFontSize } = uiSlice.actions;
export default uiSlice.reducer;
