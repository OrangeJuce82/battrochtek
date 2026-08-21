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
        URLSearchParams: "readonly",
        location: "readonly",
        history: "readonly",
        fetch: "readonly",
        Response: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        atob: "readonly",
        btoa: "readonly",
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
