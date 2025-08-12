// utils/network.js
function getNetwork(mobile) {
  const prefix = mobile.slice(0, 3);
  if (['070', '074', '075'].includes(prefix)) return 'Airtel';
  if (['076', '077', '078'].includes(prefix)) return 'MTN';
  return 'Unknown / Unsupported';
}

function validateMobile(mobile) {
  const isValidFormat = /^07\d{8}$/.test(mobile);
  const network = getNetwork(mobile);
  return {
    isValid: isValidFormat && network !== 'Unknown / Unsupported',
    network,
    reason: !isValidFormat
      ? 'Invalid format: must be 10 digits starting with 07'
      : network === 'Unknown / Unsupported'
      ? 'Unsupported network prefix'
      : 'Valid'
  };
}

module.exports = { getNetwork, validateMobile };