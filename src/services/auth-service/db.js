import { getState, save } from "./store.js";

export const ROLES = ["customer", "vendor", "admin"];

export async function findOrCreateAccount(role, identifier) {
  const state = getState();
  let account = state.accounts.find((a) => a.role === role && a.identifier === identifier);

  if (!account) {
    account = {
      id: state.nextAccountId++,
      role,
      identifier,
      name: null,
      is_verified: 0,
      created_at: new Date().toISOString(),
    };
    state.accounts.push(account);
    await save();
  }

  return account;
}

export async function getAccountById(id) {
  return getState().accounts.find((a) => a.id === id) || null;
}

export async function markAccountVerified(id) {
  const account = getState().accounts.find((a) => a.id === id);
  if (account) {
    account.is_verified = 1;
    await save();
  }
}
