/**
 * Maps DAWG shadcn primitives to @signalworks/forms field groups.
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormFieldComponents } from "@/lib/signalworks/forms";

export const dawgFormFieldComponents: FormFieldComponents = {
  Label: ({ htmlFor, children, className }) => (
    <Label htmlFor={htmlFor} className={className}>
      {children}
    </Label>
  ),
  Input: ({
    id,
    type = "text",
    required,
    value,
    onChange,
    autoComplete,
    className,
  }) => (
    <Input
      id={id}
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      className={className}
    />
  ),
  Checkbox: ({ id, checked, onCheckedChange, className }) => (
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      className={className}
    />
  ),
};
