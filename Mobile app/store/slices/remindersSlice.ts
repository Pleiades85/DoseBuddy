import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Reminder } from '../types';

interface RemindersState {
  reminders: Reminder[];
}

const initialState: RemindersState = {
  reminders: [],
};

const remindersSlice = createSlice({
  name: 'reminders',
  initialState,
  reducers: {
    setReminders: (state, action: PayloadAction<Reminder[]>) => {
      state.reminders = action.payload;
    },
    addReminder: (state, action: PayloadAction<Reminder>) => {
      state.reminders.push(action.payload);
    },
    toggleReminder: (state, action: PayloadAction<string>) => {
      const reminder = state.reminders.find(r => r.id === action.payload);
      if (reminder) {
        reminder.enabled = !reminder.enabled;
      }
    },
    deleteReminder: (state, action: PayloadAction<string>) => {
      state.reminders = state.reminders.filter(r => r.id !== action.payload);
    },
  },
});

export const { setReminders, addReminder, toggleReminder, deleteReminder } = remindersSlice.actions;
export default remindersSlice.reducer;