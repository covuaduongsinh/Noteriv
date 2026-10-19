---
title: Your Account
order: 7
---

# Your Account

Your account is your email address and password. Everything about it is under **Account** at the bottom of **Your vaults** (the page you see after signing in, at `/vaults`).

## Verify your email

When you sign up, Noteriv sends an email with a **Verify email** button to the address you entered. Opening the link confirms the address is yours; the page says **Your email is verified.** The link works once and expires after 24 hours.

Until you do, **Account** shows *Your email is not verified yet.* with **Send the link again**. A new link replaces the old one; you can ask for one about once a minute.

The emails are written in the language of the page you were on when you asked for them.

## Before your email is verified

Until you follow the verification link, a few things that reach outside Noteriv or use a lot of server resources wait:

- adding [attachments](../features/attachments-and-trash.md) (an [import](../features/import-export.md) still brings in the notes; the attachments are listed as not uploaded);
- adding a [sync connection](../sync/index.md) and anything that talks to GitHub, including **New vault from GitHub…**;
- creating a [web clipper](../features/web-clipper.md) bookmarklet;
- **Download PDF** and **Preview PDF** (**Print…** works).

Trying one of them says *Verify your email first*. Everything else — notes, folders, search, plugins, themes — works right away. Your email address is not case-sensitive: `Ana@Example.com` and `ana@example.com` are the same account.

## Forgot your password

1. On the sign-in page, choose **Forgot password?**.
2. Enter your account's email and choose **Send link** (some servers first show a short bot check). The page answers the same way whether or not the address has an account, so it cannot be used to find out who uses Noteriv.
3. Open the email **Reset your Noteriv password** and choose **Reset password**.
4. Enter a new password (at least 8 characters) and choose **Save new password**.

The link works once and expires after **1 hour**. After the change, every device that was signed in has to sign in again with the new password. If nothing arrives, check your spam folder and try again after a minute.

If **Forgot password?** is not on the sign-in page, this Noteriv server does not send email; ask the person who runs it to reset your password.

## Change your email

1. Under **Account**, choose **Change email**.
2. Enter the **New email** and your **Current password**, then choose **Send confirmation link**.
3. Open the email **Confirm the new email for your Noteriv account**, sent to the new address, and choose **Confirm new email**.

Your email changes only when you follow that link (within 24 hours); until then you keep signing in with the old one. Once it changes:

- you sign in with the new address, and every device has to sign in again;
- the old address gets an email saying the change happened. If you did not make it, contact us at the address in the Privacy Policy.

## Plan and usage

Every account is on a plan; new accounts are on **Free**. **Settings → Plan and usage** shows your plan and how much of it you use:

| | Free plan |
|---|---|
| Vaults | 10 |
| Attachment storage, for all your vaults together | 1 GB (each file up to 25 MB) |
| Sync connections, across all your vaults | 3 |
| History versions kept per note ([note history](../features/note-history.md)) | 50 |

When something would go past a limit — a new vault, an attachment, a sync connection — Noteriv says so and nothing is added; what you already have stays. Delete what you no longer need, or choose **Need more room? Contact us**, which opens an email to us.

## If your account is locked

An administrator can lock an account, for example after abuse is reported. A locked account is signed out everywhere and signing in says *This account is locked.* If you think this is a mistake, write to the address shown there.

## Download your data or delete the account

- **Download all my data (JSON)** saves your vaults with their folders, notes, plugins and sync settings (without passwords or tokens) as one file; attachments are not in it. To export a single vault as Markdown files, see [Vaults](vaults.md).
- **Delete account** asks for a second click, then permanently removes the account and all its vaults, notes and attachments. It cannot be undone.

> **Desktop app:** the desktop app has no account; its vaults are folders on your computer. See [Desktop app](../desktop.md).
