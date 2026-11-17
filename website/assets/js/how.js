// How it works: live free days in the owner steps
(() => {
  V.getPaymentConfig().then(({ pricing }) => {
    V.$('#ownerLine').textContent = `Your first ${pricing.freeDays} days are free. Customers pay straight to your MoMo.`;
  }).catch(() => { /* keep default text */ });
})();
