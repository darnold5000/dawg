# Forms (validation + field groups)

Reusable **intake-style** validation and controlled field groups. Inject your design system (`Label`, `Input`, `Checkbox`) — no shadcn dependency in the module.

## Installation

1. Path-alias `forms/src/index.ts`.
2. Map components from your UI library:

```tsx
import { EmergencyContactFields } from "@signalworks/forms";

<EmergencyContactFields
  idPrefix="intake"
  values={...}
  onChange={setEmergency}
  components={{
    Label: ({ htmlFor, children, className }) => (
      <Label htmlFor={htmlFor} className={className}>{children}</Label>
    ),
    Input: ({ id, ...props }) => <Input id={id} {...mapProps(props)} />,
    Checkbox: ({ id, checked, onCheckedChange }) => (
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
    ),
  }}
/>
```

## Public API

- `validation.ts` — email, phone, person name, emergency contacts, waiver
- `fields.tsx` — `PersonNameFields`, `ContactEmailPhoneFields`, `EmergencyContactFields`, `WaiverAcceptance`

## Testing

```bash
cd signalworks-modules/forms && npx vitest run
```
