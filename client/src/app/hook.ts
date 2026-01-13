import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"
import { RootState, store } from "./store"

export type AppDispatch = typeof store.dispatch // Type for dispatch function
export const useAppDispatch: () => AppDispatch = useDispatch
export const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
// import type { RootState, AppDispatch } from "./store";

// // Typed version of useDispatch
// export const useAppDispatch = () => useDispatch<AppDispatch>();

// // Typed version of useSelector
// export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
