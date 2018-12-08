import bcrypt from "bcryptjs";

module.exports = {
  generateSalt: () => {
    let salt = bcrypt.genSaltSync(11);
    return salt;
  },
  hashPassword: (password, salt) => {
    let passwordHash = bcrypt.hashSync(password, salt);
    return passwordHash;
  }
};
