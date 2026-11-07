"use client";

import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  value,
  disabled,
  placeholder = "未填写",
  onCommit,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onCommit: (value: string, record: boolean) => void;
}) {
  const started = useRef(value);
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="h-11 bg-card text-base md:text-sm"
        onFocus={() => {
          started.current = value;
        }}
        onChange={(event) => onCommit(event.target.value, false)}
        onBlur={() => {
          if (value !== started.current) onCommit(value, true);
        }}
      />
    </Field>
  );
}

export function AreaField({
  id,
  label,
  hint,
  value,
  disabled,
  onCommit,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  disabled?: boolean;
  onCommit: (value: string, record: boolean) => void;
}) {
  const started = useRef(value);
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Textarea
        id={id}
        value={value}
        disabled={disabled}
        placeholder="未填写。空着不是 0。"
        className="min-h-24 bg-card text-base md:text-sm"
        onFocus={() => {
          started.current = value;
        }}
        onChange={(event) => onCommit(event.target.value, false)}
        onBlur={() => {
          if (value !== started.current) onCommit(value, true);
        }}
      />
    </Field>
  );
}

export function SelectField({
  id,
  label,
  hint,
  value,
  disabled,
  options,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  disabled?: boolean;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Stamp({
  tone,
  children,
  className,
}: {
  tone: "established" | "closed" | "manual" | "fixed" | "open" | "written" | "optional";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[13rem] min-h-6 items-center whitespace-normal rounded-full px-2 py-0.5 text-right text-xs leading-4 font-medium",
        className,
        tone === "established" && "bg-[#d7efe6] text-[#14383e]",
        tone === "written" && "bg-[#d7efe6] text-[#14383e]",
        tone === "closed" && "bg-[#f3e4d6] text-[#6e3b28]",
        tone === "open" && "bg-[#f3e4d6] text-[#6e3b28]",
        tone === "manual" && "bg-[#f0d7a6] text-[#3d2a12]",
        tone === "optional" && "bg-[#efe4d0] text-[#3d2a12]",
        tone === "fixed" && "bg-[#d9e6f2] text-[#1a314a]",
      )}
    >
      {children}
    </span>
  );
}

export function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#e7c48a] bg-[#fff8ec] px-3 py-3 text-sm leading-6 text-[#3d2a12]">
      <p className="font-medium">{title}</p>
      <div className="mt-1 text-[#5c4630]">{children}</div>
    </div>
  );
}
