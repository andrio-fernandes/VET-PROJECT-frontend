// =============================================
// TYPED REDUX HOOKS
//
// Thin typed wrappers so components never need to repeat the RootState /
// AppDispatch imports just to call useDispatch / useSelector.
// =============================================

import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";

import type { RootState, AppDispatch } from "./store";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
