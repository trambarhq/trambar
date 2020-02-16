let codePushDeploymentKeys = {};

if (process.env.PLATFORM === 'cordova' && process.env.NODE_ENV === 'production') {
  codePushDeploymentKeys = {
    android: {
      Production: 'mwgABsCDDa9F2RhCP_cQ7QUF21c316dff513-0bda-4eff-8585-a112bd2d2a35',
      Staging: '13mEh6dsZ6mqzr1PTxnfa8K1cKhH16dff513-0bda-4eff-8585-a112bd2d2a35',
      Development: '54cd-TPVAON2tP2W-XPfBKaWD7C416dff513-0bda-4eff-8585-a112bd2d2a35',
    },
    ios: {
      Production: '3nM-0mvNP3mRtbPzbuvhiJT-VdbV16dff513-0bda-4eff-8585-a112bd2d2a35',
      Staging: 'IIQiAOWvfVp70mEsaXtVNYerR8pj16dff513-0bda-4eff-8585-a112bd2d2a35',
      Development: 'vetTdgV7cfxo3Sj8-sdV8MvEUzHm16dff513-0bda-4eff-8585-a112bd2d2a35',
    },
  }
}

export {
  codePushDeploymentKeys
};
