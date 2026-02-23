import { useContext } from 'react';
import { ToastCtx } from '../components/ToastCtx';

/** Access the app-wide toast + confirm (provided by <ToastProvider>). */
const useToast = () => useContext(ToastCtx);

export default useToast;
