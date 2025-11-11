
exports.generateDefaultPassword = (name, phone) => {
  if (!name || !phone) {
    throw new Error('Name and phone are required to generate password');
  }

  // Remove spaces and get first 4 characters of name
  const cleanName = name.replace(/\s+/g, '').toLowerCase();
  const first4 = cleanName.substring(0, 4);
  
  // Get last 4 digits of phone
  const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
  const last4 = cleanPhone.slice(-4);
  
  // Capitalize first letter
  const capitalizedFirst4 = first4.charAt(0).toUpperCase() + first4.slice(1);
  
  return `${capitalizedFirst4}@${last4}`;
};

/**
 * Validate if string is a valid default password format
 */
exports.isDefaultPasswordFormat = (password) => {
  // Pattern: 4 chars @ 4 digits
  const pattern = /^[A-Za-z]{4}@\d{4}$/;
  return pattern.test(password);
};