let SystemSettingsTypedef;
if (process.env.NODE_ENV !== 'production') {
  SystemSettingsTypedef = {
    input_languages: Array(String),
    address: String,
    push_relay: String,
  }
}

export {
  SystemSettingsTypedef
};
