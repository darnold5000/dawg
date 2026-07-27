export const TOAST_ERROR_DURATION_MS = 14_000;
export const TOAST_SUCCESS_DURATION_MS = 5_000;
export const TOAST_DEFAULT_DURATION_MS = 6_000;

export type ToastApi = {
  error: (
    message: string,
    options?: { duration?: number; closeButton?: boolean },
  ) => void;
  success: (message: string, options?: { duration?: number }) => void;
};

export function createToastHelpers(toast: ToastApi) {
  return {
    toastError(message: string) {
      toast.error(message, {
        duration: TOAST_ERROR_DURATION_MS,
        closeButton: true,
      });
    },
    toastSuccess(message: string) {
      toast.success(message, { duration: TOAST_SUCCESS_DURATION_MS });
    },
  };
}
