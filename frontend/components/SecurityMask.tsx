import React, { useEffect } from 'react';

const SecurityMask: React.FC = () => {
    useEffect(() => {
        // 1. Disable Right Click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        // 2. Disable DevTools Shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I (Inspect) or Ctrl+Shift+J (Console) or Ctrl+U (Source)
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault();
                return false;
            }
        };

        // 3. Clear Console Loop (The "Mask")
        const consoleInterval = setInterval(() => {
            console.clear();
            console.log("%cSTOP!", "color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0px black;");
            console.log("%cThis is a browser feature intended for developers. Accessing this area without authorization is restricted.", "font-size: 16px; font-family: sans-serif;");
        }, 2000);

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            clearInterval(consoleInterval);
        };
    }, []);

    return null; // Renderless component
};

export default SecurityMask;
