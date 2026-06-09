import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Auth Store ────────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,

      setAuth: (token, user) => {
        localStorage.setItem("token", token);
        set({ token, user, isAuthenticated: true, isAdmin: !!user?.is_admin });
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");
        set({ token: null, user: null, isAuthenticated: false, isAdmin: false });
      },

      validateAuth: () => {
        const state = get();
        if (!state.token || state.token === 'null' || state.token === 'undefined') {
          get().logout();
          return false;
        }
        return true;
      },
    }),
    { 
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.token || state.token === 'null' || state.token === 'undefined') {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
            state.isAdmin = false;
            localStorage.removeItem("token");
            localStorage.removeItem("auth-storage");
          }
        }
      },
    },
  ),
);

// ── Interview Store — PERSISTED so state survives page refresh/navigation ─────
export const useInterviewStore = create(
  persist(
    (set, get) => ({
      // Session info
      sessionId: null,
      domain: null,
      difficulty: null,
      status: "idle",

      // Live interview progress
      questionIndex: 0,
      allResults: [],
      currentQ: null,
      
      // NEW: Enhanced status tracking
      questionStatuses: {}, // { 0: { visited: true, answered: true, reviewLater: false, answerId: 123 } }
      answersCache: {}, // { 0: { question_id: 1, answer_text: "A", score: 10, ... } }

      // Final report
      report: null,

      // Actions
      setSession: (sessionId, domain, difficulty) =>
        set({
          sessionId,
          domain,
          difficulty,
          status: "active",
          questionIndex: 0,
          allResults: [],
          currentQ: null,
          questionStatuses: {},
          answersCache: {},
          report: null,
        }),

      setCurrentQ: (q) => set({ currentQ: q }),
      
      setQuestionIndex: (index) => set({ questionIndex: index }),

      // Mark question as visited (just opened, not answered yet)
      markVisited: (index) => set((state) => ({
        questionStatuses: {
          ...state.questionStatuses,
          [index]: { 
            ...state.questionStatuses[index], 
            visited: true 
          }
        }
      })),
      
      // Mark question as answered with result
      markAnswered: (index, result) => set((state) => ({
        questionStatuses: {
          ...state.questionStatuses,
          [index]: { 
            ...state.questionStatuses[index],
            visited: true,
            answered: true,
            answerId: result.question_id
          }
        },
        answersCache: {
          ...state.answersCache,
          [index]: result
        }
      })),
      
      // Toggle review for later
      toggleReview: (index) => set((state) => ({
        questionStatuses: {
          ...state.questionStatuses,
          [index]: { 
            ...state.questionStatuses[index], 
            reviewLater: !(state.questionStatuses[index]?.reviewLater || false)
          }
        }
      })),
      
      // Clear answer (mark as unanswered)
      clearAnswer: (index) => set((state) => {
        const newCache = { ...state.answersCache };
        delete newCache[index];
        const newResults = state.allResults.filter(r => {
          const cachedIndex = Object.keys(state.answersCache).find(k => state.answersCache[k].question_id === r.question_id);
          return cachedIndex !== String(index);
        });
        
        return {
          questionStatuses: {
            ...state.questionStatuses,
            [index]: { 
              ...state.questionStatuses[index],
              answered: false,
              answerId: null
            }
          },
          answersCache: newCache,
          allResults: newResults
        };
      }),

      addResult: (result) =>
        set((s) => ({
          allResults: [...s.allResults, result],
        })),

      setReport: (report) => set({ report, status: "completed" }),

      reset: () =>
        set({
          sessionId: null,
          domain: null,
          difficulty: null,
          status: "idle",
          questionIndex: 0,
          allResults: [],
          currentQ: null,
          report: null,
          questionStatuses: {},
          answersCache: {},
        }),
    }),
    {
      name: "interview-storage",
      partialize: (state) => ({
        sessionId: state.sessionId,
        domain: state.domain,
        difficulty: state.difficulty,
        status: state.status,
        questionIndex: state.questionIndex,
        allResults: state.allResults,
        currentQ: state.currentQ,
        report: state.report,
        questionStatuses: state.questionStatuses,
        answersCache: state.answersCache,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.status === "completed") {
          state.status = "idle";
          state.sessionId = null;
          state.domain = null;
          state.difficulty = null;
          state.questionIndex = 0;
          state.allResults = [];
          state.currentQ = null;
          state.questionStatuses = {};
          state.answersCache = {};
        }
      },
    },
  ),
);
