import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: ["node_modules", ".next", "dist", "build"],
    plugins: {
      react,
      "react-hooks": hooks,
    },
    rules: {
      // Core sanity
      "no-unused-vars": "warn",

      // React Hooks (most important)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];