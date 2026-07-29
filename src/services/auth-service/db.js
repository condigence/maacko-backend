import Account from "../../models/Account.js";

export const ROLES = ["customer", "vendor", "admin"];

export async function findOrCreateAccount(role, identifier) {
  let account = await Account.findOne({ role, identifier });

  if (!account) {
    account = await Account.create({ role, identifier });
  }

  return account;
}

export async function getAccountById(id) {
  return Account.findById(id);
}

export async function markAccountVerified(id) {
  await Account.findByIdAndUpdate(id, { is_verified: true });
}
