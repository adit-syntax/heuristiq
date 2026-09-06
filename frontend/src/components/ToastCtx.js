import { createContext } from 'react';

// App-wide toast, confirm and prompt context. Kept in its own module (not
// Toast.jsx) so react-refresh can hot-swap the UI components cleanly.
export const ToastCtx = createContext({ toast: () => {}, confirm: async () => false, prompt: async () => null });
