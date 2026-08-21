const rules = {
  "no-undef": "error",
  "no-unreachable": "error",
  "no-constant-binary-expression": "error",
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  eqeqeq: ["error", "always", { null: "ignore" }],
};

export default [
  {
    ignores: ["vendor/**", "dist/**", "node_modules/**"],
  },
  {
    files: ["app.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
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
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        Response: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        atob: "readonly",
        btoa: "readonly",
        Uint8Array: "readonly",
      },
    },
    rules,
  },
  {
    files: ["service-worker.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        Response: "readonly",
        URL: "readonly",
        console: "readonly",
      },
    },
    rules,
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        fetch: "readonly",
        Uint8Array: "readonly",
      },
    },
    rules,
  },
];
