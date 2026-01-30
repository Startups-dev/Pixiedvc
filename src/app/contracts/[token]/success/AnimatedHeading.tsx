'use client';

import { useEffect, useState } from 'react';

type Props = {
  children: string;
};

export default function AnimatedHeading({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <h1
      className={`mt-3 text-center text-4xl font-semibold text-emerald-600 transition-all duration-300 ease-out ${
        ready ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {children}
    </h1>
  );
}
