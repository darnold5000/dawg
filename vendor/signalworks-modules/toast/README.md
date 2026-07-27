# Toast helpers

Small, **Sonner-agnostic** durations and helpers. The client passes its `toast` instance (from `sonner`).

## Installation

Path-alias `signalworks-modules/toast/src/index.ts` or copy into `lib/toast-messages.ts`:

```ts
import { toast } from "sonner";
import { createToastHelpers } from "@signalworks/toast";

export const { toastError, toastSuccess } = createToastHelpers(toast);
```

## Testing

Logic-only; no tests required beyond typecheck.
