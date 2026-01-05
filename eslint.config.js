import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  // 🔒 Global ignores (ESLint v9 REQUIRED)
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "supabase/**", // Edge Functions (Deno)
    ],
  },

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    plugins: {
      "@typescript-eslint": tsPlugin,
      react,
      "react-hooks": hooks,
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      /* ------------------------------
       * TypeScript
       * ------------------------------ */
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      /* ------------------------------
       * React
       * ------------------------------ */
      "react/react-in-jsx-scope": "off", // React 17+
      "react/jsx-uses-react": "off",

      /* ------------------------------
       * Hooks (CRITICAL)
       * ------------------------------ */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
