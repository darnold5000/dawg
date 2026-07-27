import { toast } from "sonner";

const ERROR_DURATION_MS = 14_000;
const SUCCESS_DURATION_MS = 5_000;

export function toastError(message: string) {
  toast.error(message, {
    duration: ERROR_DURATION_MS,
  });
}

export function toastSuccess(message: string) {
  toast.success(message, { duration: SUCCESS_DURATION_MS });
}
