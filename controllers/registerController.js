const { registerUser, formatUserResponse } = require('../services/registerService');
const { createdResponse } = require('../utils/responseHelper');

const register = async (req, res) => {
  const user = await registerUser(req.body);
  const userData = formatUserResponse(user);

  createdResponse(
    res,
    { user: userData },
    'Registration successful! Your application has been submitted for document verification. Please login to continue.'
  );
};

module.exports = {
  register,
};
