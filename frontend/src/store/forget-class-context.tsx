import { useEffect, createContext, useReducer, useCallback } from "react";

import { forgetClassNames } from "../constants/forgetClassNames";
import {
  Action,
  ForgetClass,
  ForgetClassContextType,
} from "../types/forget-class-context";

const FORGET_CLASS = "forgetClass";

export const ForgetClassContext = createContext<ForgetClassContextType>({
  forgetClass: undefined,
  selectedForgetClasses: [],

  saveForgetClass: (forgetClass: string | undefined) => {},
  addSelectedForgetClass: (forgetClass: string) => {},
  retrieveForgetClassContextData: () => {},
  clearForgetClass: () => {},
  deleteSelectedForgetClass: (forgetClass: string) => {},
});

function BaselineReducer(state: ForgetClass, action: Action): ForgetClass {
  switch (action.type) {
    case "SAVE_FORGET_CLASS":
      const forgetClass = action.payload;
      sessionStorage.setItem(
        FORGET_CLASS,
        JSON.stringify({ ...state, forgetClass })
      );
      return { ...state, forgetClass };

    case "ADD_SELECTED_FORGET_CLASS":
      const target = action.payload;
      if (!state.selectedForgetClasses.includes(target)) {
        const selectedForgetClasses = [...state.selectedForgetClasses, target];
        sessionStorage.setItem(
          FORGET_CLASS,
          JSON.stringify({ ...state, selectedForgetClasses })
        );
        return { ...state, selectedForgetClasses };
      }
      return state;

    case "RETRIEVE_FORGET_CLASS_CONTEXT_DATA":
      const savedContext = sessionStorage.getItem(FORGET_CLASS);
      if (savedContext) {
        const parsedContext = JSON.parse(savedContext);
        return {
          forgetClass: parsedContext.forgetClass,
          selectedForgetClasses: parsedContext.selectedForgetClasses,
        };
      }
      return state;

    case "CLEAR_FORGET_CLASS":
      sessionStorage.removeItem(FORGET_CLASS);
      return { ...state, forgetClass: 0 };

    case "DELETE_SELECTED_FORGET_CLASS":
      const savedForgetClassContext = sessionStorage.getItem(FORGET_CLASS);
      if (savedForgetClassContext) {
        const parsedContext = JSON.parse(savedForgetClassContext);
        const originalSelectedForgetClasses =
          parsedContext.selectedForgetClasses as number[];
        const newSelectedForgetClasses = originalSelectedForgetClasses.filter(
          (item) => item !== action.payload
        );
        const newState = {
          ...state,
          selectedForgetClasses: newSelectedForgetClasses,
        };
        sessionStorage.setItem(FORGET_CLASS, JSON.stringify(newState));
        return newState;
      }
      return state;

    default:
      return state;
  }
}

export default function ForgetClassContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(BaselineReducer, {
    forgetClass: undefined,
    selectedForgetClasses: [],
  });

  const handleSaveForgetClass = useCallback(
    (forgetClass: string | undefined) => {
      dispatch({
        type: "SAVE_FORGET_CLASS",
        payload: forgetClass
          ? forgetClassNames.indexOf(forgetClass)
          : undefined,
      });
    },
    []
  );

  const handleAddSelectedForgetClass = useCallback((forgetClass: string) => {
    dispatch({
      type: "ADD_SELECTED_FORGET_CLASS",
      payload: forgetClassNames.indexOf(forgetClass),
    });
  }, []);

  const handleRetrieveForgetClassContextData = useCallback(() => {
    dispatch({ type: "RETRIEVE_FORGET_CLASS_CONTEXT_DATA" });
  }, []);

  const handleClearForgetClass = useCallback(() => {
    dispatch({ type: "CLEAR_FORGET_CLASS" });
  }, []);

  const handleDeleteSelectedForgetClass = useCallback((forgetClass: string) => {
    dispatch({
      type: "DELETE_SELECTED_FORGET_CLASS",
      payload: forgetClassNames.indexOf(forgetClass),
    });
  }, []);

  useEffect(() => {
    handleRetrieveForgetClassContextData();
  }, [handleRetrieveForgetClassContextData]);

  const ctxValue: ForgetClassContextType = {
    forgetClass: state.forgetClass,
    selectedForgetClasses: state.selectedForgetClasses,

    saveForgetClass: handleSaveForgetClass,
    addSelectedForgetClass: handleAddSelectedForgetClass,
    retrieveForgetClassContextData: handleRetrieveForgetClassContextData,
    clearForgetClass: handleClearForgetClass,
    deleteSelectedForgetClass: handleDeleteSelectedForgetClass,
  };

  return (
    <ForgetClassContext.Provider value={ctxValue}>
      {children}
    </ForgetClassContext.Provider>
  );
}
