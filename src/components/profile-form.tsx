"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";
import { updateProfile, type UpdateProfileState } from "@/app/account/actions";
import { NAME_MAX, NICKNAME_MAX } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  name: string | null;
  surname: string | null;
  nickname: string | null;
};

function SubmitButton({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending || !dirty}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState<UpdateProfileState, FormData>(
    updateProfile,
    {},
  );

  // Controlled so the Save button can stay disabled until something actually
  // changed — a form that's always "saveable" trains people to ignore it.
  const [values, setValues] = useState({
    name: profile.name ?? "",
    surname: profile.surname ?? "",
    nickname: profile.nickname ?? "",
  });

  // A successful save revalidates this page, so the incoming props *are* the
  // new baseline; nothing to track locally.
  const baseline = {
    name: profile.name ?? "",
    surname: profile.surname ?? "",
    nickname: profile.nickname ?? "",
  };
  const dirty =
    values.name !== baseline.name ||
    values.surname !== baseline.surname ||
    values.nickname !== baseline.nickname;

  function set(field: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">First name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="given-name"
            maxLength={NAME_MAX}
            placeholder="Andrius"
            value={values.name}
            onChange={set("name")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="surname">Last name</Label>
          <Input
            id="surname"
            name="surname"
            autoComplete="family-name"
            maxLength={NAME_MAX}
            placeholder="Kleinas"
            value={values.surname}
            onChange={set("surname")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nickname">
          Nickname{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="nickname"
          name="nickname"
          autoComplete="nickname"
          maxLength={NICKNAME_MAX}
          placeholder="What your buddies call you"
          value={values.nickname}
          onChange={set("nickname")}
          aria-describedby="nickname-hint"
        />
        <p id="nickname-hint" className="text-muted-foreground text-xs">
          This is what we call you, and what your buddies see on your challenges.
        </p>
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton dirty={dirty} />
        {state.ok && !dirty && (
          <span
            className="text-success-ink inline-flex items-center gap-1.5 text-sm font-medium"
            role="status"
          >
            <Check className="size-4" aria-hidden />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
