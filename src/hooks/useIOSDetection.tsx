import { useEffect, useState } from 'react';

export function useIOSDetection() {
  const [isIOS, setIsIOS] = useState(false);
  const [isModernIOS, setIsModernIOS] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    
    // Detectar iOS (iPhone, iPad, iPod)
    const iOS = /iPad|iPhone|iPod/.test(userAgent);
    
    // Detectar versão do iOS
    const iOSVersionMatch = userAgent.match(/OS (\d+)_/);
    const iOSVersion = iOSVersionMatch ? parseInt(iOSVersionMatch[1], 10) : 0;
    
    setIsIOS(iOS);
    setIsModernIOS(iOS && iOSVersion >= 14);
    
    console.log('[iOS Detection]', {
      isIOS: iOS,
      version: iOSVersion,
      isModernIOS: iOS && iOSVersion >= 14,
      userAgent: userAgent
    });
  }, []);

  return { isIOS, isModernIOS };
}
