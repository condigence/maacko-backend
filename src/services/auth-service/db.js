import User from "../../models/User.js";

export async function findExistingUser(email, mobile) {
  return User.findOne({ $or: [{ email }, { mobile }] });
}

export async function getUserById(id) {
  return User.findById(id);
}

export async function findUserByIdentifierAndRole(identifier, role) {
  return User.findOne({ role, $or: [{ email: identifier }, { mobile: identifier }] });
}

export async function createUser({ name, role, email, mobile }) {
  const [first_name, ...rest] = name.trim().split(/\s+/);

  return User.create({
    first_name,
    last_name: rest.join(" "),
    email,
    mobile,
    role,
  });
}
