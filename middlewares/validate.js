const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return error(res, 'Validation failed', 400, errorMessages);
  }
  
  next();
};