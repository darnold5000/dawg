import type { ReactNode } from "react";

import type {
  ContactEmailPhoneValues,
  EmergencyContactsValues,
  PersonNameValues,
} from "./validation";

export type FormFieldComponents = {
  Label: (props: {
    htmlFor: string;
    children: ReactNode;
    className?: string;
  }) => ReactNode;
  Input: (props: {
    id: string;
    type?: string;
    required?: boolean;
    value: string;
    onChange: (value: string) => void;
    autoComplete?: string;
    className?: string;
  }) => ReactNode;
  Checkbox: (props: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
  }) => ReactNode;
};

export type PersonNameFieldsProps = {
  idPrefix: string;
  legend: string;
  values: PersonNameValues;
  onChange: (values: PersonNameValues) => void;
  components: FormFieldComponents;
  className?: string;
};

export function PersonNameFields({
  idPrefix,
  legend,
  values,
  onChange,
  components,
  className,
}: PersonNameFieldsProps) {
  const { Label, Input } = components;
  return (
    <fieldset className={className}>
      <legend>{legend}</legend>
      <div>
        <Label htmlFor={`${idPrefix}-first`}>First name</Label>
        <Input
          id={`${idPrefix}-first`}
          required
          value={values.firstName}
          onChange={(firstName) => onChange({ ...values, firstName })}
          autoComplete="given-name"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-last`}>Last name</Label>
        <Input
          id={`${idPrefix}-last`}
          required
          value={values.lastName}
          onChange={(lastName) => onChange({ ...values, lastName })}
          autoComplete="family-name"
        />
      </div>
    </fieldset>
  );
}

export type ContactEmailPhoneFieldsProps = {
  idPrefix: string;
  values: ContactEmailPhoneValues;
  onChange: (values: ContactEmailPhoneValues) => void;
  components: FormFieldComponents;
  className?: string;
};

export function ContactEmailPhoneFields({
  idPrefix,
  values,
  onChange,
  components,
  className,
}: ContactEmailPhoneFieldsProps) {
  const { Label, Input } = components;
  return (
    <div className={className}>
      <div>
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          required
          value={values.email}
          onChange={(email) => onChange({ ...values, email })}
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          required
          value={values.phone}
          onChange={(phone) => onChange({ ...values, phone })}
          autoComplete="tel"
        />
      </div>
    </div>
  );
}

export type EmergencyContactFieldsProps = {
  idPrefix: string;
  values: EmergencyContactsValues;
  onChange: (values: EmergencyContactsValues) => void;
  components: FormFieldComponents;
  className?: string;
};

export function EmergencyContactFields({
  idPrefix,
  values,
  onChange,
  components,
  className,
}: EmergencyContactFieldsProps) {
  const { Label, Input } = components;
  return (
    <fieldset className={className}>
      <legend>Emergency contacts</legend>
      <div>
        <Label htmlFor={`${idPrefix}-ec1-name`}>Contact 1 name</Label>
        <Input
          id={`${idPrefix}-ec1-name`}
          required
          value={values.primary.name}
          onChange={(name) =>
            onChange({ ...values, primary: { ...values.primary, name } })
          }
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-ec1-phone`}>Contact 1 phone</Label>
        <Input
          id={`${idPrefix}-ec1-phone`}
          type="tel"
          required
          value={values.primary.phone}
          onChange={(phone) =>
            onChange({ ...values, primary: { ...values.primary, phone } })
          }
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-ec2-name`}>Contact 2 name (optional)</Label>
        <Input
          id={`${idPrefix}-ec2-name`}
          value={values.secondary?.name ?? ""}
          onChange={(name) =>
            onChange({
              ...values,
              secondary: { name, phone: values.secondary?.phone ?? "" },
            })
          }
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-ec2-phone`}>Contact 2 phone (optional)</Label>
        <Input
          id={`${idPrefix}-ec2-phone`}
          type="tel"
          value={values.secondary?.phone ?? ""}
          onChange={(phone) =>
            onChange({
              ...values,
              secondary: {
                name: values.secondary?.name ?? "",
                phone,
              },
            })
          }
        />
      </div>
    </fieldset>
  );
}

export type WaiverAcceptanceProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  components: Pick<FormFieldComponents, "Checkbox" | "Label">;
  label: ReactNode;
  className?: string;
};

export function WaiverAcceptance({
  id,
  checked,
  onCheckedChange,
  components,
  label,
  className,
}: WaiverAcceptanceProps) {
  const { Checkbox, Label } = components;
  return (
    <div className={className}>
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
