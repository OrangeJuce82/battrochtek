export default [
  {
    files: ["**/*.js", "**/*.mjs"],
    ignores: ["vendor/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        caches: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        AudioContext: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        self: "readonly",
        URL: "readonly",
        Uint8Array: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-constant-binary-expression": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "eqeqeq": ["error", "always", { "null": "ignore" }]
    }
  }
];
