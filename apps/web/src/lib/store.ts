// src/lib/store.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/authSlice";
import eventsReducer from "./features/eventsSlice";
import listerReducer from "./features/listerSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      events: eventsReducer,
      lister: listerReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
