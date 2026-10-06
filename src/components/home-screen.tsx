import React, { useState, useEffect } from 'react';
import { UsernamePromptModal } from './UsernamePromptModal';
import { MobileSimpleHomeScreen } from './MobileSimpleHomeScreen';

export function HomeScreen({ 
  inspectorName, 
  inspectorNik, 
  onNav, 
  userPt 
}: { 
  inspectorName: string; 
  inspectorNik: string; 
  onNav: (tab: any) => void;
  userPt?: string;
}) {
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  
  const [currentUsername, setCurrentUsername] = useState(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      return profile.username || localStorage.getItem('p2h_inspector_username') || '';
    } catch(e) {
      return '';
    }
  });

  // Prompt user to set username if not set yet
  useEffect(() => {
    if (inspectorNik && !currentUsername && !sessionStorage.getItem('username_prompted')) {
      sessionStorage.setItem('username_prompted', 'true');
      setShowUsernameModal(true);
    }
  }, [inspectorNik, currentUsername]);

  return (
    <>
      <MobileSimpleHomeScreen
        inspectorName={inspectorName}
        inspectorNik={inspectorNik}
        onNav={onNav}
        userPt={userPt}
      />

      {/* Username / Nama Panggilan Setup Modal */}
      <UsernamePromptModal 
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        nik={inspectorNik}
        currentUsername={currentUsername}
        fullName={inspectorName}
        onUsernameUpdated={(newU) => {
          setCurrentUsername(newU);
        }}
      />
    </>
  );
}
