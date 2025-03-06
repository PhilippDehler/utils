export function use_debug(label: string) {
  console.group(label);
  return {
    [Symbol.dispose]: () => {
      console.groupEnd();
    },
  };
}
