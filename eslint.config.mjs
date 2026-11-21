import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    // React Compiler advisory rules added in eslint-plugin-react-hooks 6+. They flag
    // existing patterns (setState in effects, ref reads during render) that work today.
    // Kept visible as warnings until those components are refactored; not silenced.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
