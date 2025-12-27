export default () => {
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  return {
    plugins: isTest ? [] : ["@tailwindcss/postcss"],
  };
};
