import { toast } from "sonner";
import { createToastHelpers } from "@/lib/signalworks/toast";

export const { toastError, toastSuccess } = createToastHelpers(toast);
