'use client';

import { useEffect, useRef } from 'react';

export function AdsterraBanner() {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adRef.current) return;

    // Clear any existing content
    adRef.current.innerHTML = '';

    // Create config script
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.text = `
      atOptions = {
        'key' : '1e5c77f8d4fabb3958b6a2f764ff3e9f',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;

    // Create invoke script
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://elegantimpose.com/1e5c77f8d4fabb3958b6a2f764ff3e9f/invoke.js';

    // Append both scripts to the container
    adRef.current.appendChild(configScript);
    adRef.current.appendChild(invokeScript);
  }, []);

  return (
    <div className="flex justify-center my-6">
      <div 
        ref={adRef}
        style={{ width: '320px', height: '50px' }}
      />
    </div>
  );
}
