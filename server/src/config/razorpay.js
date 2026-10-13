const Razorpay = require('razorpay');

let razorpayInstance = null;

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  const isKeyIdValid = Boolean(keyId && keyId !== 'rzp_test_xxxxxxxxx' && keyId.startsWith('rzp_test_'));
  const isKeySecretValid = Boolean(keySecret && keySecret !== 'xxxxxxxxxxxxxxxx');

  if (!isKeyIdValid || !isKeySecretValid) {
    console.warn('⚠️ Razorpay test key validation warning:', {
      hasKeyId: Boolean(keyId),
      isKeyIdPlaceholder: keyId === 'rzp_test_xxxxxxxxx',
      keyIdStartsWithRzpTest: keyId ? keyId.startsWith('rzp_test_') : false,
      hasKeySecret: Boolean(keySecret),
      isKeySecretPlaceholder: keySecret === 'xxxxxxxxxxxxxxxx'
    });
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

module.exports = getRazorpayInstance;
